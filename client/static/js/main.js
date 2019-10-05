String.prototype.replaceAll = function(str1, str2) {
	return this.split(str1).join(str2);
}

String.prototype.toHex = function() {
	return parseInt(this).toString(16);
}

String.prototype.fromHex = function(str) {
	return parseInt(str, 16);
}

Number.prototype.clamp = function(min, max) {
  	return Math.min(Math.max(this, min), max);
}

Array.prototype._push = Array.prototype.push;

Array.prototype.push = function(value) {
	this._push(value);
	return this;
}

Array.prototype.virtualPush = function(value) {
	let arr = this.slice();
	arr.push(value);
	return arr;
}

Array.prototype.virtualPop = function(value) {
	let arr = this.slice();
	arr.pop();
	return arr;
}

Array.prototype.isEmpty = function() {
	return this.length <= 0;
}

Array.prototype.stringifyBeforeSend = function() {
	if (!shouldBeStringified(this)) return JSON.stringify(this.slice());

	let directory_ = this.slice();
	let directory = [];

	directory_.forEach(item => {directory.push(JSON.stringify(item).slice(1, -1))});
	return JSON.stringify(directory);
}

Array.prototype.stringifyBeforeSend_ = function() {	
	let directory_ = this.slice();
	let directory = [];

	directory_.forEach(item => {directory.push(JSON.stringify(item).slice(1, -1))});
	return JSON.stringify(directory);
}

FormData.prototype.append_ = FormData.prototype.append; 

FormData.prototype.append = function(var1, var2) { 
	this.append_(var1, var2); 
	return this; 
}

function isValidJSON(value) {
	try { JSON.parse(value); }
	catch (e) { return false; }

	return true;
}

function findParentWithAttribute(startElem, attribute, includeSelf = true, maxIterations = 3) {
	//Check if element is an element
	if (!startElem.getAttribute) return;

	let elem = startElem; 

	if (elem.getAttribute(attribute)) return elem;

	for (let i = 0; i < maxIterations; i++) {
		elem = elem.parentNode;

		if (!elem.getAttribute) return;

		if (elem.getAttribute(attribute)) return elem;
	}

	return null;
}

function isURIValid(uri) {
	try { 
  		decodeURIComponent(uri); 
	} catch(e) { 
  		return false;
	}
	
	return true;
}

function isElement(element) {
	return element.tagName != null;
}

function id(name) {
	return document.getElementById(name);
}

function sanitize(string) {
	return (isURIValid(string) ? decode(string) : string).replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&#x22;").replaceAll("'", "&#x27;");
}

function encode(string) {
	return encodeURIComponent(isURIValid(string) ? decodeURIComponent(string) : string);
}

function decode(string) {
	return decodeURIComponent(string);
}

function encodeArray(array) { 
	let res = [];

	array.forEach(item => res.push(encode(item)));

	return res;
}

function decodeArray(array) { 
	let res = [];

	array.forEach(item => res.push(decode(item)));

	return res;
}

function shouldBeStringified(arr) { 
	return JSON.stringify(JSON.parse(arr.stringifyBeforeSend_())) == JSON.stringify(arr)
}

let fileCache = {};
let directoriesToUpdateFileCache = {};

const dragSelect = new DragSelect({
	selectables: document.querySelectorAll('.list-group-item'),
	area: document.querySelector(".main"),
  	onDragStart: function(event) {
		let element = findParentWithAttribute(event.target, "data-type");

		if (!element) return;
		
		if (element.classList.contains("ds-selectable")) { this.break(); }
		  
		if (fileManager.selectionMode != SELECTION_MODE.NONE) fileManager.draggedFiles = fileManager.selectedFiles;
		//console.log(fileManager.selectedFiles, fileManager.draggedFiles)

		//Make all selected files selected
		fileManager.draggedFiles.forEach(item => { item.classList.add("ds-selected"); });
  	},
  	onElementSelect: function(element) {
		fileManager.selectedFiles.add(element);
		fileManager.selectionMode = SELECTION_MODE.SINGLE;
		console.log("Add", element);
  	},
  	onElementUnselect: function(element) {
		  if (!element.getAttribute("data-no-unselect") == "true") fileManager.selectedFiles.delete(element);
		  console.log("Remove", element);
  	},
  	callback: function(elements_) { 
  		elements = []; elements_.forEach(element => elements.push(element));

  		console.log("Callback", elements);

  		if (elements.length > 0) {
  			fileManager.selectedFiles = new Set(elements);
		} 
		if (elements.length > 1) {
			fileManager.selectionMode = SELECTION_MODE.SELECT;
		} 
		if (elements.length <= 0) {
  			fileManager.selectedFiles.forEach(element => {
				element.classList.remove("ds-selected"); 
				element.classList.remove("ds-dragged");
			});

  			fileManager.clearSelectedFiles();
  		}
  	}
});
dragSelect._breaked = false;

const NO_CALLBACK = null;

const SELECTION_MODE = {
	NONE: 0,
	SINGLE: 1,
	SELECT: 2,
	DRAG: 3
}

let keysPressed = {};

let fileManager = new FileManager();
let requestManager = new RequestManager();

function shouldDoRedirect(data) {
	if (typeof data == "string")
		data = JSON.parse(data);

	if (data.newURL) window.location = data.newURL;
	if (data.err)  {
		//Change history
		history.replaceState({}, null, "/My Drive");

		fileManager.getFiles(JSON.stringify(["My Drive"]), files => {
			fileManager.directory = ["My Drive"];
		});
	}
}

function isMobile() {
	if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
		return true;
	}

	return false;
}

function setFileClick() {
	const fileElems = id("files").childNodes; //Get all files and folders

	for (let i = 1; i < fileElems.length; i++) {
		if (fileElems[i].id == "emptyFolder") break;

		const file = fileElems[i];

		//Get file/folder
		const fileName = file.innerText;
		const isFolder = fileElems[i].getAttribute("data-type") == "directory";
	
		//Mouse enter
		file.addEventListener("mouseenter", event => {
			if (fileManager.draggedFiles.size > 0 && fileManager.selectionMode == SELECTION_MODE.SELECT) {
				event.target.classList.add("ds-selected");
			}
		});

		//Mouse leave
		/*file.addEventListener("mouseleave", event => {
			if (fileManager.draggedFiles.size > 0 && event.target.classList.contains("ds-selected")) {
				//event.target.classList.remove("ds-selected");
			}
		});*/

		//Mouse down
		file.addEventListener("mousedown", downHandler);

		//Mouse up
		file.addEventListener("mouseup", upHandler);

		//Touch end (mouse up for touch)
		file.addEventListener("touchend", touchEndHandler);

		//Touch start (mouse down for touch)
		file.addEventListener("touchstart", touchStartHandler);

		//Disable right click context menu
		file.addEventListener("contextmenu", event => { event.preventDefault(); });

		//Left click
		file.addEventListener('dblclick', fileClickHandler);

		//Right click
		file.addEventListener('auxclick', fileClickHandler);

		function fileClickHandler(event) {
			event.preventDefault();

			//If not pressing with left, middle or right mouse button
			if (event.button > 2) return;

			//If file is a folder (doesn't have an extension)
			if (isFolder) {
				//Navigate to that directory
				fileManager.getFiles(fileManager.directory.virtualPush(fileName), files => { 
					fileManager.directory.push(fileName);

					updateURL(); 
				});
			} else { //If file is not a folder (has an extension)
				getFile(fileName); //Open file
			}
		}

		function downHandler(event) {
			//If not pressing with left, middle or right mouse button
			if (event.button > 2) return;
			
			event.preventDefault();

	  		const fileElem = findParentWithAttribute(event.target, "data-type");
			if (!fileElem) return;
			
			console.log("Selection mode", fileManager.selectionMode)
				  
			if (fileManager.selectionMode == SELECTION_MODE.SINGLE) fileManager.clearSelectedFiles();

			if (fileManager.selectionMode != SELECTION_MODE.NONE && fileManager.selectionMode != SELECTION_MODE.SINGLE) dragSelect.break();

			if (!fileElem.classList.contains("ds-selected")) {
				fileManager.selectedFiles.add(fileElem);
				fileManager.selectionMode = SELECTION_MODE.SINGLE;
			}

			fileElem.setAttribute("data-mousedown", "true");

			if (fileManager.selectedFiles.size > 0) {
				fileManager.selectedFiles.forEach(file => file.setAttribute("data-no-unselect", "true"));

				setTimeout(function() {
					if (fileManager.selectedFiles.size > 0 && fileElem.classList.contains("ds-selected") && fileElem.getAttribute("data-mousedown") == "true") {
						fileManager.selectedFiles.forEach(file => file.classList.add("ds-dragged"))
	
						fileManager.draggedFiles = fileManager.selectedFiles;
						fileManager.selectionMode = SELECTION_MODE.DRAG;
	
						fileManager.draggedFiles.forEach(item => { item.setAttribute("data-no-unselect", "true"); });
					}
				}, 750);
			}
		}

		function upHandler(event) {
			//If not pressing with left, middle or right mouse button
			if (event.button > 2) return;

			event.preventDefault();

			const fileElem = findParentWithAttribute(event._target || event.target, "data-type");
			if (!fileElem) return;
			
			fileElem.setAttribute("data-mousedown", "false")

			if (fileManager.draggedFiles.size > 0 && document.querySelector(".ds-selector").style.display == "none") {
				fileManager.moveFiles(fileElem);

				fileElem.setAttribute("data-no-click", true);

				event.stopImmediatePropagation();
			}

			fileElem.classList.remove("ds-dragged");
		}

		function touchStartHandler(event) {
			event.preventDefault();

			let fileElem = findParentWithAttribute(document.elementFromPoint(event.changedTouches[0].clientX, event.changedTouches[0].clientY), "data-type"); 
			if (!fileElem) return;
				  
			if (fileManager.selectionMode == SELECTION_MODE.SINGLE) fileManager.clearSelectedFiles();

			if (fileManager.selectionMode != SELECTION_MODE.NONE && fileManager.selectionMode != SELECTION_MODE.SINGLE) dragSelect.break();

			if (!fileElem.classList.contains("ds-selected")) {
				fileManager.selectedFiles.add(fileElem);
				fileManager.selectionMode = SELECTION_MODE.SINGLE;
			}

			fileElem.setAttribute("data-mousedown", "true");

			if (fileManager.selectedFiles.size > 0) {
				fileManager.selectedFiles.forEach(file => file.setAttribute("data-no-unselect", "true"));

				setTimeout(function() {
					if (fileManager.selectedFiles.size > 0 && fileElem.classList.contains("ds-selected") && fileElem.getAttribute("data-mousedown") == "true") {
						fileManager.selectedFiles.forEach(file => file.classList.add("ds-dragged"))
	
						fileManager.draggedFiles = fileManager.selectedFiles;
						fileManager.selectionMode = SELECTION_MODE.DRAG;
	
						fileManager.draggedFiles.forEach(item => { item.setAttribute("data-no-unselect", "true"); });
					}
				}, 750);
			}
		}

		function touchEndHandler(event) {
			event.preventDefault();
			console.log(event)
			let fileElem = findParentWithAttribute(document.elementFromPoint(event.changedTouches[0].clientX, event.changedTouches[0].clientY), "data-type"); 
			console.log(fileElem)
			if (!fileElem) return;
			
			fileElem.setAttribute("data-mousedown", "false")

			if (fileManager.draggedFiles.size > 0 && document.querySelector(".ds-selector").style.display == "none") {
				fileManager.moveFiles(fileElem);

				fileElem.setAttribute("data-no-click", true);

				event.stopImmediatePropagation();
			}

			fileElem.classList.remove("ds-dragged");
		}
	}

	dragSelect.setSelectables(document.querySelectorAll(".list-group-item"));

	const folderNames = id("folderName").childNodes;

	folderNames.forEach((folder, i) => {
		//Click
		folder.addEventListener("click", event => {
			event.preventDefault();

			//If trying to drag a folder into here
			if (folder.getAttribute("data-no-click") == "true") {
				folder.setAttribute("data-no-click", "false");

				return false;
			}

			const directory = fileManager.directory.slice(0, i + 1);

			fileManager.getFiles(directory, files => { 
				fileManager.directory = directory; 

				updateURL(); 
			});
		});

		//Mouse up
		folder.addEventListener("mouseup", event => {
			event.preventDefault();

			const element = event.target;

			if (fileManager.draggedFiles.size > 0 && document.querySelector(".ds-selector").style.display == "none") {
				const directory = fileManager.directory.slice(0, i + 1);

				fileManager.moveFiles({ 
					name: directory,
					path: directory.stringifyBeforeSend() 
				});

				element.setAttribute("data-no-click", "true");

				event.preventDefault();
				event.stopImmediatePropagation();
			}
		});
	});
}

function updateURL(fileName) {
	//Remove previous path
	history.replaceState({}, null, "/");
	//Append path to url
	history.pushState({}, "", encodeArray(fileName || fileManager.directory).join("/"));
}

function downloadFile(fileName) {
   	const username = getCookie('user');
   	const id = getCookie('id');
    const path = encodeURIComponent(currentDir + "/");

    fileName = encodeURIComponent(fileName);

    window.open('/download-file?p=' + path + "&n=" + fileName);

	connectionManager.statusCode({
		message: 'Downloading...',
		statusCode: 20,
	});
}

function toggleNav() { if (id("sidenav").classList.contains("nav-open")) closeNav(); else openNav(); }

function openNav() {
	id("sidenav").classList.add("nav-open");
	id("sidenav").classList.remove("displayNone");
	id("sidenav").classList.remove("nav-closed");

	$("#sidenav").animate({
        width: "+=75%", maxWidth: "+=225px"
    }, 375);

  	$(".main").animate({
    	marginLeft: "+=" + (document.querySelector(".mainContainer").offsetWidth * 0.75).clamp(0, 225),
  	}, 375);
}

function closeNav() {
	id("sidenav").classList.remove("nav-open");

	$("#sidenav").animate({
        width: "-=75%", maxWidth: "-=225px"
    }, 375);

  	$(".main").animate({
    	marginLeft: "-=" + (document.querySelector(".mainContainer").offsetWidth * 0.75).clamp(0, 225),
  	}, 375);
}

function getFile(fileName, openParam = "_") {
    window.wind = window.open("/file/" + encode(JSON.stringify(fileManager.directory.virtualPush(fileName))));  
}

if (isMobile()) {
	id("sidenav").classList.remove("nav-open");
	id("sidenav").classList.remove("navSlideOut");

	id("sidenav").classList.add("nav-mobile");
	id("sidenav").classList.add("nav-closed");
	id("sidenav").classList.add("displayNone");

	document.querySelector(".main").classList.remove("mainSlideOut");
} else {
	$("#sidenav").animate({
        width: "+=75%", maxWidth: "+=225px"
    }, 375);

  	$(".main").animate({
    	marginLeft: "+=" + (document.querySelector(".mainContainer").offsetWidth * 0.75).clamp(0, 225),
  	}, 375);
}

function setFileNames(files, directory) {
	if (!files) return;
	console.log("Update files", directory);

	let html = "", folderNameHtml = "";
	html += "<h3 id='fileStatus'></h3>";

	directory.forEach((item, i) => { folderNameHtml += "<span class='folder-name-path' title='" + sanitize(item) + "'>" + sanitize(item) + (i < directory.length-1 ? "/" : "") + "</span>"; });

	$("#folderName").html(folderNameHtml);

	if (!id("folderName").innerHTML) {
		id("folderName").innerHTML = "root";
		id("folderName").style = "visibility:hidden";
	} else {
		id("folderName").style = "";
	}

	if (files.length == 0) {
		html += "<h3 id='emptyFolder'>There are no files in this folder</h3><input id='uploadFileBtn' class='btn btn-large' type='button' readonly value='Upload File' onclick='fileManager.chooseFile()'>";
	}

	for (i = 0; i < files.length; i++) {
		html += "<div data-type='" + sanitize(files[i].type) + "'";

		if (files[i].type == "directory") {	
			//Add folder icon svg
			html += "class='list-group-item'><svg class='folder-item folderIcon' x='0px' y='0px' focusable='false' viewBox='0 0 24 24' height='32px' width='32px' fill='#8f8f8f'><g><path d='M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z'></path><path d='M0 0h24v24H0z' fill='none'></path></g></svg>" + 
				"<span class='file-name' title='" + sanitize(files[i].name) + "'>" + sanitize(files[i].name) + "</div>";
		} else {
			html += "class='list-group-item file-item'>" + "<img class='file-item-img' src='https://drive-thirdparty.googleusercontent.com/128/type/application/octet-stream' draggable='false'>" + 
				"<span class='file-name' data-filetype='" + sanitize(files[i].name.split(".")[files[i].name.split(".").length - 1]) + "' title='" + sanitize(files[i].name) + "'>" + sanitize(files[i].name) + "</span></div>";
		}

	}

	$("#files").html(html);
}

window.onpopstate = function(event) {
	//If at root directory
	if (fileManager.directory.length < 1) return;

	fileManager.getFiles(fileManager.directory.slice(0, -1), files => {
		fileManager.directory.pop();

		updateURL();
	});
};

window.onload = function() {
	//Set button onlick functions
	id("backBtn").addEventListener("click", event => { fileManager.directoryUp(); }); 
	id("newFolderBtn").addEventListener("click", event => { fileManager.newFolder(); }); 
	id("refreshBtn").addEventListener("click", event => { fileManager.reloadFiles(); }); 
	id("uploadFileBtn").addEventListener("click", event => { fileManager.chooseFile(); }); 
	id("logoutBtn").addEventListener("click", event => { RequestManager.logout(); }); 
	id("getApiKeyBtn").addEventListener("click", event => { RequestManager.getApiKey(); }); 

	id("toggleSettingsBtn").addEventListener('click', event => {
		document.querySelector(".options-window").classList.toggle("visible");
	});

	id("fileUploadInput").addEventListener('change', event => { fileManager.uploadFile(); });
}

document.addEventListener("mouseup", event => {
	//Clear currently selected files
	fileManager.draggedFiles = [];
	fileManager.selectedFiles.forEach(file => file.classList.remove("ds-dragged"));
	document.querySelectorAll(".ds-dragged").forEach(file => file.classList.remove("ds-dragged"));
});

document.addEventListener("keydown", event => {
	console.log(event)
	if (event.key == "Control") keysPressed.ctrl = true;
	if (event.key == "Shift") keysPressed.shift = true;
});
document.addEventListener("keyup", event => {
	console.log(event)
	if (event.key == "Control") keysPressed.ctrl = false;
	if (event.key == "Shift") keysPressed.shift = false;
});

document.addEventListener("blur", event => {
	keysPressed = {};
});