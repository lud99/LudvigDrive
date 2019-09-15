const express = require('express');
const cookieParser = require('cookie-parser');
const router = require('./server/router');
const app = express();

app.use(express.static("client/static"));

app.use("/*", router);

app.use(cookieParser());

const server = require('http').createServer(app);
const io = require('socket.io').listen(server);

const formidable = require('formidable');

const fs = require('fs');

const JSONSet = require('./server/JSONSet');

const Client = require('./server/client');
const Session = require('./server/session');
const EncryptDecrypt = require('./server/EncryptDecrypt');
const FileManager = require('./server/FileManager');
const ResponsesManager = require('./server/ResponsesManager');
const Logins = require('./server/Logins');
const Utils = require('./server/Utils');
const SessionManager = require('./server/Sessions');

server.listen(process.env.PORT || 80);
process.stdout.write('\033c') //Clear console
console.log("Server started");

const fileManager = new FileManager(fs);
const responsesManager = new ResponsesManager(fs);
const logins = new Logins(fileManager, new EncryptDecrypt(489));
const utils = new Utils();

String.prototype.replaceAll = function(str1, str2) {
	return this.split(str1).join(str2);
}

String.prototype.isValidJSON = function() {
    try { JSON.parse(this); }
    catch (e) { return false; }
    
    return true;
}

String.prototype.escape = function() {
	if (this.isValidJSON()) return this;

	res = this;
	for (let i = 0; i < this.length; i++) {
		if (this[i] == "\"" && this[i-1] != "[" && this[i-1] != "," && this[i+1] != "," && this[i+1] != "]") {
			res = this.slice(0, i) + String.fromCharCode(92) + this.slice(i);
	    }
	}

	return res;
}

function broadcast(clients, data) {
	clients.forEach(client => {
		client.send(data);
	});
}

function decryptMessage(msg) {
 	const data = JSON.parse(msg);

	//Decrypt key to message
	let msgArr = data.d.split('');
	let key = data.d.slice(msgArr.length-18);

	const crypt = new EncryptDecrypt();
	const decryptedKey = crypt.decrypt(key);
	crypt.key = decryptedKey

	//Decrypt message
	const _msg = data.d.slice(0, -18);
	return JSON.parse(crypt.decrypt(_msg));
}

function sendFiles(res, dir) {
	const id = res.locals.id;

	//Get username
	const username = utils.decode(global.sessions.get(id).state.username);

		console.log("server/files/" + username + "/" + dir);

	//Get files
	fileManager.readDirectory("server/files/" + username + "/" + dir, true /*Don't create folder if it doesn't exist*/, (err, items) => {
		if (err) {
			res.send({err: err});
			return console.log(err);
		} else {
			console.log("Files in '%s'", dir, items);
			res.send({items: items});
		}
	});
}

app.get("/", (req, res) => {
	const id = res.locals.id;
	const isLoggedIn = res.locals.isLoggedIn;

	console.log("New request to '/' with the cookie id '%s'", id == null ? "" : id);

	//Check if the client is logged in
	if (isLoggedIn) {
		console.log("The client is logged in");

		return res.sendFile(__dirname + '/client/home.html');
	}

	res.sendFile(__dirname + '/client/login.html');
});

app.get("/login", (req, res) => {
	res.sendFile(__dirname + '/client/login.html');
});

app.get("/luddoc", function(req, res) {
	res.sendFile(__dirname + '/LudvigDocs/index.html');
});

app.get("/download-file", function(req, res) {
	sendFile(req, res, true);
});

app.get("/dev-login", (req, res) => {
	const isLoggedIn = res.locals.isLoggedIn;

	if (isLoggedIn) console.log("Client is already loggged in");
	else sessions.logIn(res.locals.id, "dev");
	
	res.sendFile(__dirname + "/client/home.html");
});

app.get("/files*", (req, res) => {
	const isLoggedIn = res.locals.isLoggedIn;
	const url = req.url;

	if (isLoggedIn) {
		console.log("Client is loggged in");

		//Check if valid JSON
		if (!utils.decode(url).split("/files/").join("").escape().isValidJSON()) return utils.redirect(res, "/My%20Drive");

		//Get directory
		let dirArray = JSON.parse(utils.decode(url).split("/files/").join("").escape());
		let dir = dirArray.join("/"); 
		let encodedDir = utils.encodeArray(dirArray).join("/");

		//Get files
		sendFiles(res, encodedDir);
	} else {
		utils.redirect(res, "/My%20Drive", true /*JavaScript Redirect*/);
	}
});

app.get("/file*", (req, res) => {
	const isLoggedIn = res.locals.isLoggedIn;
	const id = res.locals.id;
	const url = req.url;

	if (isLoggedIn) {
		console.log("Client is loggged in");

		//Get username
		const username = utils.decode(global.sessions.get(id).state.username);

		//Check if valid JSON
		if (!utils.decode(url).split("/file/").join("").escape().isValidJSON()) return utils.redirect(res, "/My%20Drive");

		//Get directory
		const dirArray = JSON.parse(utils.decode(url).split("/file/").join("").escape());
		const dir = dirArray.join("/"); 
		const encodedDir = utils.encodeArray(dirArray).join("/");

		//Get filename
        const filename = dirArray.slice(-1)[0];

        //Set the filename
        res.setHeader('Content-Disposition', 'filename=' + filename);

        //Check if the file exists
        if (fileManager.exists("server/files/" + username + "/" + encodedDir)) 
			res.sendFile(__dirname + "/server/files/" + username + "/" + encodedDir, { dotfiles: "allow" });
        else {
        	console.log("The requested file '%s' doesn't exist", dir);
        	utils.redirect(res, "/My%20Drive");
        }

	} else {
		utils.redirect(res, "/My%20Drive");
	}
});

app.get("/*", (req, res) => {
	const id = res.locals.id;
	const isLoggedIn = res.locals.isLoggedIn;
	const url = req.url;

	console.log("New request to '%s' with the cookie id '%s'", url, id == null ? "" : id);

	//Check if the client is logged in
	if (isLoggedIn) {
		console.log("The client is logged in");

		return res.sendFile(__dirname + '/client/home.html');
	}

	res.sendFile(__dirname + '/client/login.html');
});

app.post("/new-folder*", (req, res) => {
	const isLoggedIn = res.locals.isLoggedIn;
	const id = res.locals.id;
	const url = req.url;

	if (isLoggedIn) {
		//Get username
		const username = utils.decode(global.sessions.get(id).state.username);

		//Check if valid JSON
		if (!utils.decode(url).split("/new-folder/").join("").escape().isValidJSON()) return utils.redirect(res, "/My%20Drive");

		//Get directory
		const dirArray = JSON.parse(utils.decode(url).split("/new-folder/").join("").escape());
		const dir = dirArray.join("/"); 
		const encodedDir = utils.encodeArray(dirArray).join("/");

		//Create folder
		fileManager.createDirectory("server/files/" + username + "/" + encodedDir);

		//Get files
		sendFiles(res, encodedDir.split("/").slice(0, -1).join("/"));
	} else utils.redirect(res, "/My%20Drive");
});

app.post("/register", (req, res) => {
	const id = res.locals.id;
 	
 	//Parse form
 	new formidable.IncomingForm().parse(req, (err, fields, files) => {
 		//Check if the client is logged in
		if (res.locals.isLoggedIn) {
			console.log("Client is already logged in");
		} else {
			//If the password and username already exists
			let usernameExists = false;
			const loginsArray = Array.from(logins.data);

			loginsArray.forEach(login => {
				login = JSON.parse(login);

				console.log(login);
				if (login.username == fields.username) usernameExists = true;
			});

			if (!usernameExists) {
				//Encode username
				fields.username = utils.encode(fields.username);

    			logins.add(fields);
				console.log("Succesfully registered account '%s'", fields.username);

				res.send(responsesManager.responses["registerSuccess"]);
			} else {
				console.log("Invalid username");
				
				res.send(responsesManager.responses["registerAlreadyExists"]);
			}
		}
    });
});

app.post("/login", (req, res) => {
	const id = res.locals.id;
 	
 	//Parse form
 	new formidable.IncomingForm().parse(req, (err, fields, files) => {
 		//Check if the client is logged in
		if (res.locals.isLoggedIn) {
			console.log("Client is already logged in");

			utils.redirect(res, "/My%20Drive");
		} else {
			//Encode username
			fields.username = utils.encode(fields.username);

			console.log(fields);

			//If the password and username are correct
			if (logins.data.hasObject(fields)) {
    			sessions.logIn(id, fields.username);
				console.log("Succesfully logged in account '%s' with the id '%s'", fields.username, id);

				utils.redirect(res, "/My%20Drive", true /*JavaScript Redirect*/);
			} else {
				console.log("Invalid username or password");
				
				res.send(responsesManager.responses["invalidLogin"]);
			}
		}
    });
});

app.post("/logout", (req, res) => {
	const id = res.locals.id;
	const isLoggedIn = res.locals.isLoggedIn;

	if (isLoggedIn) {
		sessions.delete(id);

		console.log("Successfully logged out client '%s'", id);

		utils.redirect(res, "/My%20Drive", true /*JavaScript Redirect*/);
	}
});

app.post('/upload-file*', (req, res) => {
	const id = req.cookies.id;
	const url = req.url;

	//Get username
	const username = utils.decode(global.sessions.get(id).state.username);

	//Check if valid JSON
	if (!utils.decode(url).split("/upload-file/").join("").escape().isValidJSON()) return utils.redirect(res, "/My%20Drive", true);

	//Get directory
	const dirArray = JSON.parse(utils.decode(url).split("/upload-file/").join("").escape());
	const dir = dirArray.join("/"); 
	const encodedDir = utils.encodeArray(dirArray).join("/");

 	//Parse form
 	new formidable.IncomingForm().parse(req, (err, fields, files) => {
 		const file = files.file;

 		fileManager.copyFile(file, "server/files/" + username + "/", encodedDir + "/" + utils.encode(file.name), err => {
 			if (err) return;
 		
			sendFiles(res, (encodedDir + "/" + utils.encode(file.name)).split("/").slice(0, -1).join("/"));
 		});
 	});
})

/*io.sockets.on("connection", function(conn) {

	let client;
	console.log("Connection established with a client");

	//Disconnect
	conn.on('disconnect', () => {
		console.log("Connection closed with a client");
		if (!client) return;

		client.disconnected = true;

		//Remove client after 10 minutes
		setInterval(function() {
			if (client.disconnected) {
				const session = client.session;
				if (session) { //If client is in an session
					console.log("Client '" + client.username + "' with the id '" + client.id + 
						"' has been logged out for 10 minutes, logging them out now");

					session.leave(client); //Leave
					if (session.clients.size == 0) { //If it's empty
						sessions.delete(session.id); //Delete it
					}
				}
			}
		}, 10 * 60 * 1000); //Run every 10 minutes
	});

	//Receive messages
	conn.on('message', msg => {
		const data = decryptMessage(msg); 

		console.log("Message received", data);

		switch(data.type) {
			case "connection": {
				const isLoggedIn = loggedIn(data.username, data.id, client);

				//If the login check changed the username (happens if the client has a valid id but a username of undefined)
				if (typeof(isLoggedIn) == "string")
					data.username = isLoggedIn;

				//If client's cookie id is stored in a client
				const matchingClient = getClient(data.username, data.id);
				if (matchingClient && matchingClient.disconnected) {
					//Reconnect new client to that client
					client = matchingClient;
					client.conn = conn;
					client.disconnected = false;
					console.log("Reconnected with client '" + client.username + "' with the id '%s'", client.id);

					client.send({
						type: 'login',
						success: true,
						message: "Successfully logged in",
						statusCode: 0,
						id: data.id,
					});
					return;
				}

				console.log("A new client is not already logged in, logging them in now");
				client = createClient(conn);

				client.send({
					type: "not-logged-in",
				});
				break;
			};
			case "login-request": {
				const username = encode(data.username);
				const password = encode(data.password);
				const logins = fileManager.logins;
				let success = false;

				for (let i = 0; i < logins.users.length; i++) {
					if (username == logins.users[i].username && password == logins.users[i].password) {
						success = true;
						break;
					} else {
						success = false;
					}
				}

				if (success) {
					const id = createId();
					console.log("Succesfully logged in account '%s'"
						+ "' with the id '" + id + "'", username);

					const session = getSession(username) || createSession(username);
					session.join(client);

					client.send({
						type: 'login',
						success: true,
						message: "Successfully logged in",
						statusCode: 0,
						id: id,
						username: username,
					});

					client.username = username;
					client.id = id;
				} else {
					client.send({
						type: 'login',
						success: false,
						message: "Either your username and password does not match or you are not registered",
						statusCode: 1,
					});
				}
				break;
			};
			case "logout-request": {
				if (!loggedIn(data.username, data.id)) return;

				const session = client.session;
				if (session) { //If client is in an session
					session.leave(client); //Leave
					if (session.clients.size == 0) { //If it's empty
						sessions.delete(session.id); //Delete it
					}
				}

				client.send({
					type: "logout"
				});
				break;
			};
			case "register-request": {
				const username = encode(data.username);
				const password = encode(data.password);
				const logins = fileManager.logins;

				let usernameExists = false;

				for (let i = 0; i < logins.users.length; i++) {
					if (username == logins.users[i].username) {
						usernameExists = true;
						break;
					} else {
						usernameExists = false;
					}
				}

				if (usernameExists) {
					client.send({
						type: 'register',
						success: false,
						message: 'An account already with that username already exists',
						statusCode: 11,
					});
				} else {
					logins.users.push({username: username, password: password});
					fileManager.saveLogins('./server/logins.json');

					console.log("Succesfully registered account", logins.users[logins.users.length-1]);

					client.send({
						type: 'register',
						success: true,
						message: 'Your account was succesfully registered',
						statusCode: 10,
					});
				}

				break;
			};
			case "get-content-request": {
				const isLoggedIn = loggedIn(data.username, data.id, client);
				if (!isLoggedIn) return;
				//If the login check changed the username (happens if the client has a valid id but a username of undefined)
				if (typeof(isLoggedIn) == "string")
					data.username = isLoggedIn;

				fileManager.readDirectory(data.username, client.id, data.dirPath, sendContent, false);
				break;
			};
			case "new-folder-request": {
				if (!loggedIn(data.username, data.id, client)) return;

				fileManager.checkDirectory("./server/files/" + encode(data.username) + encode("/My Drive/" + data.dirPath + '/').replaceAll("%2F", "/") + encode(data.folderName), true, false);
				fileManager.readDirectory(data.username, data.id, data.dirPath, sendContent);
				break;
			};
		}
	});
});*/