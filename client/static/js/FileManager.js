class FileManager
{
	constructor() 
	{
		this.directory = window.location.pathname != "/" ? window.location.pathname.split("/").slice(1) : ["My Drive"];

		if (window.location.pathname == "/") history.pushState(null, null, "My%20Drive");

		this.getFiles();
	}

	chooseFile()
	{
		id("fileUploadInput").click();
	}

	directoryUp() 
	{
		//If at root directory
		if (this.directory.length < 1) return;

		let oneUp = this.directory.slice(0, -1);

		this.getFiles(JSON.stringify(oneUp), true, files => {
			//Go back in url
			history.replaceState({}, null, "/" + this.directory.slice(0, this.directory.length - 1).join("/"));

			//Remove the current directory from the array
			this.directory.pop();
		});
	}

	getFiles(directory = JSON.stringify(this.directory), loadFromCache = true, callback)
	{	
		if (loadFromCache) {
			//Update files with the cached ones (if they exist)
			if (window.files[directory]) {
				console.log("Updating from cache");
				this.updateFiles(JSON.parse(window.files[directory]).items, JSON.parse(directory)); 

				callback(JSON.parse(window.files[directory]));
			}
		}

		//Load from server if specified or no cached files exists
		if (!loadFromCache || !window.files[directory]) {
			RequestManager.requestData("GET", "/files/" + encode(directory), files => { 
				//Save the files in a variable to 'cache' them
				let filesAreUpdated = false;
				if (JSON.stringify(window.files[directory]) != JSON.stringify(files)) {
					filesAreUpdated = true;
					window.files[directory] = files;
				}

				shouldDoRedirect(files);

				if (filesAreUpdated) this.updateFiles(JSON.parse(files).items, JSON.parse(directory)); 

				if (callback) callback(files);
			});
		}
	}

	uploadFile()
	{
	    const fileInput = id('fileUploadInput'); //Get file input
	    const file = fileInput.files[0]; //Get file

	    if (!file) return;

	    let data = new FormData();
		data.append('file', file); //Add file

		const xhr = new XMLHttpRequest();

		xhr.open('POST', '/upload-file/' + encode(JSON.stringify(this.directory)), true);
		let self = this;
		xhr.onreadystatechange = function() {
	  		if (xhr.readyState === 4 && xhr.status === 200) {
	  			console.log(xhr.responseText);
	  			const files = JSON.parse(xhr.responseText);
	  			console.log(files);
		    	shouldDoRedirect(files); 
		    	self.updateFiles(files.items); 
		  	}
		}

		xhr.send(data); //Send file

		if (fileInput.value != "") {
			/*connectionManager.statusCode({
				message: 'Uploading...',
				statusCode: 20,
			});*/
		}

		fileInput.value = "";
	}

	updateFiles(files, directory = this.directory)
	{
		if (!files) return;

		setFileNames(files, directory);
		setFileClick()
	}

	reloadFiles() 
	{
		this.getFiles(JSON.stringify(this.directory), false /*Refresh cache*/);
	}

	newFolder() 
	{
		let folderName = prompt("Please enter folder name", "New Folder");

		if (!folderName) folderName = "New Folder";

		RequestManager.requestData("POST", "/new-folder/" + encode(JSON.stringify(this.directory.virtualPush(folderName))), files => { 
			shouldDoRedirect(files);
			this.updateFiles(JSON.parse(files).items); 
		});
	}
}