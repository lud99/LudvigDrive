String.prototype.replaceAll = function(str1, str2) {
	return this.split(str1).join(str2);
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
	let arr = this.slice(0);
	arr.push(value);
	return arr;
}

Array.prototype.virtualPop = function(value) {
	let arr = this.slice(0);
	arr.pop();
	return arr;
}

class ConnectionManager
{
	constructor(socket)
	{
		this.conn = socket;
		this.usernameField = id("username");
	}

	receive(msg)
	{
		let data = JSON.parse(msg);

		//Decrypt key to message
		let msgArr = data.d.split('');
		let key = data.d.slice(msgArr.length-18);

		const crypt = new EncryptDecrypt();
		const decryptedKey = crypt.decrypt(key);
		crypt.key = decryptedKey

		//Decrypt message
		const _msg = data.d.slice(0, -18); //Get message part
		data = JSON.parse(crypt.decrypt(_msg));
	}

	send(data) 
	{
		const msg = JSON.stringify(data);
		const key = 101 + (Math.random() * 616 | 0);

		const encrypt = new EncryptDecrypt(key);
		const encrypted = encrypt.encrypt(msg);

		encrypt.key = 102;
		const keyEncrypted = encrypt.encrypt(JSON.stringify(key));
		const d = JSON.stringify({d: encrypted + keyEncrypted});

		this.conn.send(d);
	}
}

function encode(string) {
	return encodeURIComponent(decodeURIComponent(string));
}

function requestDataForm(method, url, formDataJSON, callback) {
	const xhr = new XMLHttpRequest();
	xhr.open(method, url);
	xhr.onreadystatechange = function() {
	  	if (xhr.readyState === 4 && xhr.status === 200) {
	  		callback(xhr.responseText);
  		}
	}

	let formData = new FormData();
	let entries = Object.entries(formDataJSON);
	for (let i = 0; i < entries.length; i++) {
		formData.append(entries[i][0], entries[i][1])
	}

	xhr.send(formData);
}

window.files = {};

let fileManager = new FileManager();
let requestManager = new RequestManager();

function id(name) {
	return document.getElementById(name);
}

function sanitize(string) {
	return decodeURIComponent(string).replaceAll("<", "&#x3C;").replaceAll(">", "&#x3E;");
}

function encodeArray(array) { 
	for (let i = 0; i < array.length; i++) array[i] = this.encode(array[i]);

	return array;
}

function shouldDoRedirect(data) {
	if (typeof data == "string")
		data = JSON.parse(data);

	if (data.newURL) window.location = data.newURL;
	if (data.err)  {
		//Change history
		history.replaceState({}, null, "/My%20Drive");

		fileManager.getFiles(JSON.stringify(["My%20Drive"]), true, files => {
			fileManager.directory = ["My%20Drive"];
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
	let fileElems = id("files").childNodes; //Get all files and folder name
	let files = [];

	for (let i = 1; i < fileElems.length; i++) {
		if (fileElems[i].id == "emptyFolder") break;

		files.push(fileElems[i]); //Get all file elements
		let file = files[i-1];

		//Get file/folder
		const fileName = file.innerText;
		const fileExtension = fileName.split('.')[1] == null ? "" : fileName.split('.')[1];
		const isFolder = fileElems[i].getAttribute("data-type") == "directory";
		
		//Disable right click context menu
		file.addEventListener("contextmenu", event => { event.preventDefault(); });

		//Left click
		file.addEventListener('click', fileClickHandler);

		//Right click
		file.addEventListener('auxclick', fileClickHandler);

		function fileClickHandler(event) {
			//If file is a folder (doesn't have an extension)
			if (isFolder) {
				//Navigate to that directory
				fileManager.getFiles(JSON.stringify(fileManager.directory.virtualPush(fileName)), true, files => {
					fileManager.directory.push(fileName);

					//Remove previous path
					history.replaceState({}, null, "/");

					//Append path to url
					history.pushState({}, "", encodeArray(fileManager.directory).join("/"));
				});
			} else { //If file is not a folder (has an extension)
				getFile(fileName); //Open file
			}
		}
	}
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

function toggleNav() {
	console.log("Toggle Nav", id("sidenav").classList);
	if (id("sidenav").classList.contains("nav-open"))
		closeNav();
	else 
		openNav();
}

function openNav() {
	id("sidenav").classList.add("nav-open");
	id("sidenav").classList.remove("displayNone");
	id("sidenav").classList.remove("nav-closed");

	/*document.querySelector(".main").classList.remove("displayNone");
	document.querySelector(".main").classList.remove("mainSlideIn");
	document.querySelector(".main").classList.add("mainSlideOut");*/

	$("#sidenav").animate({
        width: "+=75%", maxWidth: "+=225px"
    }, 375);

  	$(".main").animate({
    	marginLeft: "+=" + (document.querySelector(".mainContainer").offsetWidth * 0.75).clamp(0, 225),
  	}, 375);
}

function closeNav() {
	id("sidenav").classList.remove("nav-open");
	//id("sidenav").classList.remove("navSlideOut");
	//id("sidenav").classList.add("nav-closed");
	//id("sidenav").classList.add("navSlideIn");

	/*document.querySelector(".main").classList.remove("displayNone");
	document.querySelector(".main").classList.remove("mainSlideOut");

	document.querySelector(".main").classList.add("mainSlideIn");
*/
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

	$("#folderName").html(sanitize(directory.join("/")));

	let html = "";
	html += "<h3 id='fileStatus'></h3>";

	if (files.length == 0) {
		html += "<h3 id='emptyFolder'>There are no files in this folder</h3><input id='uploadFileBtn' class='btn btn-large' type='button' readonly value='Upload File' onclick='fileManager.chooseFile()'>";
	}

	for (i = 0; i < files.length; i++) {
		html += "<div data-type='" + files[i].type + "'";

		if (files[i].type == "directory") {	
			//Add folder icon svg
			html += "class='list-group-item'><svg class='folder-item folderIcon' x='0px' y='0px' focusable='false' viewBox='0 0 24 24' height='32px' width='32px' fill='#8f8f8f'><g><path d='M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z'></path><path d='M0 0h24v24H0z' fill='none'></path></g></svg>" + 
				"<span class='file-name'>" + sanitize(files[i].name) + "</div>";
		} else {
			html += "class='list-group-item file-item'>" + "<img class='file-item-img' src='https://drive-thirdparty.googleusercontent.com/128/type/application/octet-stream'>" + 
				"<span class='file-name' data-filetype='" + files[i].name.split(".")[files[i].name.split(".").length - 1] + "'>" + sanitize(files[i].name) + "</span></div>";
		}

	}

	$("#files").html(html);
}

window.onpopstate = function(event) {
	fileManager.getFiles(JSON.stringify(fileManager.directory.slice(0, -1)), true, files => {
		fileManager.directory.pop();

		//Remove previous path
		history.replaceState({}, null, "/");

		//Append path to url
		history.pushState({}, "", encodeArray(fileManager.directory).join("/"));
	});
};

function loop() {
	if (fileStatus != null) {
		//If file download is complete
		if (document.hasFocus() && fileStatus.innerText == "Downloading...") fileStatus.innerText = "";
	} else {
		fileStatus = id("fileStatus");
	}
	requestAnimationFrame(loop);
}

window.onload = function() {
	//Set button onlick functions
	id("backBtn").addEventListener("click", event => { fileManager.directoryUp(); }); 
	id("newFolderBtn").addEventListener("click", event => { fileManager.newFolder(); }); 
	id("refreshBtn").addEventListener("click", event => { fileManager.reloadFiles(); }); 
	id("uploadFileBtn").addEventListener("click", event => { fileManager.chooseFile(); }); 
	id("logoutBtn").addEventListener("click", event => { RequestManager.logout(); }); 

	id("fileUploadInput").addEventListener('change', event => { fileManager.uploadFile(); });
}