class FileManager
{
	constructor() 
	{
		this.directory = window.location.pathname != "/" ? decodeArray(window.location.pathname.split("/").slice(1)) : ["My Drive"];

		this.directory.forEach((item, i) => { if (item == "") this.directory.splice(i); });

		if (window.location.pathname == "/") history.pushState(null, null, "My Drive");

		this.selectedFiles = new Set;
		this.draggedFiles = new Set;

		this.selectionMode = SELECTION_MODE.NONE;
		this.dragTimer = 0;

		this.getFiles();
	}

	chooseFile()
	{
		id("fileUploadInput").click();
	}

	clearSelectedFiles() { this.selectedFiles = new Set; dragSelect.setSelection(null); this.selectionMode = SELECTION_MODE.NONE }

	clearDraggedFiles() { this.draggedFiles.forEach(file => file.classList.remove("ds-dragged")); this.draggedFiles = new Set; }

	directoryUp() 
	{
		//If at root directory
		if (this.directory.length < 1) return;

		const oneUp = this.directory.slice(0, -1);

		this.getFiles(oneUp, files => {
			//Go back in url
			history.replaceState({}, null, "/" + this.directory.slice(0, this.directory.length - 1).join("/"));

			//Remove the current directory from the array
			this.directory.pop();
		});
	}

	getFiles(directory_ = this.directory, callback, options = { loadFromCache: true, bypassAllLoadFromCache: false })
	{
		const directory = decode(directory_.stringifyBeforeSend());

		this.clearSelectedFiles();

		//If specified to load from cache
		if (options.loadFromCache && (!options.bypassAllLoadFromCache && !directoriesToUpdateFileCache[directory])) {
			//Update files with the cached ones (if they exist)
			if (fileCache[directory]) {
				console.log("Updating from cache");
				this.updateFiles(JSON.parse(fileCache[directory]).items, JSON.parse(directory)); 

				if (callback) callback(JSON.parse(fileCache[directory]));
			}
		}

		//Load from server
		RequestManager.requestData("GET", "/files/" + encode(directory), files => {
			let updatedFiles = false, cacheExisted = false;

			//If no cache exists
			if (!fileCache[directory]) {
				//If the cached files are different from the ones sent by the server, update the cache
				if (JSON.stringify(fileCache[directory]) != JSON.stringify(files)) { 
					updatedFiles = true;

					console.log("Updating the cache");

					fileCache[directory] = files;
				}
			} else cacheExisted = true;

			shouldDoRedirect(files);

			if ((!options.loadFromCache ||  (!options.bypassAllLoadFromCache && directoriesToUpdateFileCache[directory])) || (updatedFiles && !cacheExisted)) {
				this.updateFiles(JSON.parse(files).items, JSON.parse(directory)); 

				if (callback) callback(files);
			}

			//Remove the update cache flag, if it exists
			if (directoriesToUpdateFileCache[directory]) {
				directoriesToUpdateFileCache[directory] = false;
			}
		});
	}

	moveFiles(param)
	{
		let targetFileElement;
		let targetFileName;
		let targetFolder;

		if (isElement(param)) targetFileElement = param; else targetFolder = param;
		console.log(param);

		//Check if in move file mode
		if (this.selectionMode != SELECTION_MODE.DRAG) return;

		//Get the target file elems name if it exists
		if (targetFileElement) targetFileName = targetFileElement.childNodes[1].innerText;


		//Get current directory
		const directory = decode(this.directory.slice().stringifyBeforeSend());

		//Get the new directory
		const newDirectory = targetFolder ? targetFolder.path : this.directory.virtualPush(targetFileName).stringifyBeforeSend();

		const fileData = {};

		//If a target folder is specified directly
		if (targetFolder) { 
			fileData.targetFolder = targetFolder;
		//Otherwise get the information from the provided element
		} else {
			//Set the target folders information
			fileData.targetFolder = { 
				name: targetFileName,
				path: newDirectory
			}
		}

		//Check if trying to move into a file
		if (targetFileElement && targetFileElement.getAttribute("data-type") != "directory") return this.clearDraggedFiles();

		fileData.itemsToMove = [];

		let error = false;

		//Get each dragged items information
		this.draggedFiles.forEach(item => {

			//Get the file information
			const name = item.childNodes[1].innerText;
			const type = item.getAttribute("data-type");

			//Check if trying to move item to a sub directory of itself
			if (name == fileData.targetFolder.name) {
				error = true;
				console.log("Can not move item into a subdirectory of itself!");
				this.selectionMode = SELECTION_MODE.SINGLE;

				return this.clearDraggedFiles();
			}

			//Check if trying to move item to the current directory
			if (this.directory.stringifyBeforeSend() == fileData.targetFolder.path) {
				error = true;
				console.log("Can not move itme into the current directory!");
				this.selectionMode = SELECTION_MODE.SINGLE;

				return this.clearDraggedFiles();
			}

			//Otherwise add them to the array
			fileData.itemsToMove.push({ 
				type: type,
				name: name,
				path: this.directory.virtualPush(name).stringifyBeforeSend() 
			});
		});

		this.draggedFiles = new Set;

		if (error) return this.clearDraggedFiles();

		//Remove all selected elements
		this.clearSelectedFiles();

		console.log("Moving Files...");
		window.t = fileData;
		
		//Send a request with the data to the server
		RequestManager.requestFormData("POST", '/move-files/' + encode(directory), new FormData().append("fileData", JSON.stringify(fileData)), data => {
  			const files = JSON.parse(data);

		 	//If the recieved files are different than the ones cached
     	 	if (fileCache[directory] != data) {
          		console.log("Updating cache");
	            fileCache[directory] = data;
	        }

	        //Set to load the files from the server (bypass cache) when the next time the user loads the target folder
	        directoriesToUpdateFileCache[newDirectory] = true; 
          
	    	shouldDoRedirect(files); 
	    	
	    	//Only update files if in the same directory as the file upload
	    	if (directory == this.directory.stringifyBeforeSend()) this.updateFiles(files.items); 
		});
	}

	uploadFile()
	{
	    const fileInput = id('fileUploadInput'); //Get file input
	    const file = fileInput.files[0]; //Get file

		const directory = decode(this.directory.slice().stringifyBeforeSend());

	    if (!file) return;

		RequestManager.requestFormData("POST", '/upload-file/' + encode(directory), new FormData().append("file", file), data => {
  			const files = JSON.parse(data);

		 	//If the recieved files are different than the ones cached
     	 	if (fileCache[directory] != data) {
          		console.log("Updating cache");
	            fileCache[directory] = data;
	        }
          
	    	shouldDoRedirect(files); 
	    	
	    	//Only update files if in the same directory as the file upload
	    	if (directory == this.directory.stringifyBeforeSend()) this.updateFiles(files.items); 
		});

		//Empty file input
		fileInput.value = null;
	}

	updateFiles(files, directory = this.directory)
	{
		if (!files) return;

		setFileNames(files, directory);
		setFileClick()
	}

	reloadFiles() 
	{
		this.getFiles(this.directory, NO_CALLBACK, { loadFromCache: false } /*Refresh cache*/);
	}

	newFolder() 
	{
		const directory = decode(this.directory.slice().stringifyBeforeSend());

		let folderName = prompt("Please enter folder name", "New Folder");

		if (!folderName) folderName = "New Folder";

		RequestManager.requestData("POST", "/new-folder/" + encode(this.directory.virtualPush(folderName).stringifyBeforeSend()), files => { 
			//If the recieved files are different than the ones cached
			if (fileCache[directory] != files) {
				console.log("Updating cache");
				fileCache[directory] = files;
			}

			shouldDoRedirect(files);
			if (directory == this.directory.stringifyBeforeSend()) this.updateFiles(JSON.parse(files).items); 
		});
	}
}