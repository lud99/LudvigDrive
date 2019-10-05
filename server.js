const express = require('express');
const cookieParser = require('cookie-parser');
const router = require('./server/router');
const apiRouter = require('./server/api/apiRouter');
const morgan = require('morgan');
const chalk = require('chalk');
const path = require('path');
const app = express();

app.use(express.static("client/static"));
app.use(morgan(function (tokens, req, res) {
	return chalk.yellowBright(tokens.method(req, res))
		+ " " + chalk.cyan(tokens.url(req, res))
		+ " " + chalk.green(tokens['response-time'](req, res))
}));
app.use("/api/", apiRouter);
app.use(/^(?!\/?api).+$/, router);

app.use(cookieParser());

const server = require('http').createServer(app);

const formidable = require('formidable');
const fs = require('fs');

const EncryptDecrypt = require('./server/EncryptDecrypt');
const FileManager = require('./server/FileManager');
const ResponsesManager = require('./server/ResponsesManager');
const Logins = require('./server/Logins');
const Utils = require('./server/Utils');

server.listen(process.env.PORT || 3000);
//process.stdout.write('\033c') //Clear console
console.log("Server started on port 3000");

const fileManager = new FileManager(fs);
const responsesManager = new ResponsesManager(fileManager);
const logins = new Logins(fileManager, new EncryptDecrypt(489));
const utils = new Utils();

global.appRoot = path.dirname(require.main.filename.replaceAll("\\", "/"));

String.prototype.replaceAll = function (str1, str2 = "") { return this.split(str1).join(str2); }

String.prototype.isValidJSON = function () {
	try { JSON.parse(this); }
	catch (e) { return false; }

	return true;
}

Array.prototype.up = function (steps = -1) { return this.slice(0, steps); }

Array.prototype._push = Array.prototype.push;
Array.prototype.push = function (item) {
	this._push(item);
	return this;
}

Array.prototype._unshift = Array.prototype.unshift;
Array.prototype.unshift = function (item) {
	this._unshift(item);
	return this;
}

function sendFiles(res, dir) {
	const id = res.locals.id;

	//Get username
	const username = utils.decode(sessions.get(id).state.username);

	//Get files
	fileManager.readDirectory(`server/files/${username}/${dir}`, true /*Don't create folder if it doesn't exist*/, (err, items) => {
		if (err) {
			res.send({ err: err });
			return console.log(err);
		} else {
			console.log("Files in %s: \n", chalk.green(`'${dir}'`), items);
			res.send({ items: items });
		}
	}, { createDirectory: false });
}

app.get("/login", (req, res) => {
	res.sendFile(__dirname + '/client/login.html');
});

app.get("/download-file", (req, res) => {
	sendFile(req, res, true);
});

app.get("/dev-login", (req, res) => {
	const isLoggedIn = res.locals.isLoggedIn;

	if (isLoggedIn) console.log("Client is already loggged in");
	else sessions.logIn(res.locals.id, "dev");

	res.sendFile(__dirname + "/client/home.html");
});

app.get("/files/:dir", (req, res) => {
	const isLoggedIn = res.locals.isLoggedIn;

	if (isLoggedIn) {
		//Get directory
		const dir = utils.getDirectory(req);

		//Check if directory was invalid JSON
		if (dir.err) return res.status(500).send(dir);

		//Get files
		sendFiles(res, dir.encoded);
	} else {
		console.log(chalk.redBright("The client is not logged in"));

		utils.redirect(res, "/My%20Drive", true /* JavaScript Redirect*/);
	}
});

app.get("/file/:dir", (req, res) => {
	const isLoggedIn = res.locals.isLoggedIn;
	const id = res.locals.id;

	if (isLoggedIn) {
		//Get username
		const username = utils.decode(sessions.get(id).state.username);

		//Get directory
		const dir = utils.getDirectory(req);

		//Check if directory was invalid JSON
		if (dir.err) return res.status(500).send(dir);

		//Get filename
		const filename = dir.array.slice(-1)[0];

		//Set the filename
		res.setHeader('Content-Disposition', `filename=${filename}`);

		//Check if the file exists
		if (fileManager.exists(`server/files/${username}/${dir.encoded}`)) {
			console.log("Sending file %s to client", chalk.green(`'${dir.string}'`));

			//Send the file and allow dotfiles
			res.sendFile(`${__dirname}/server/files/${username}/${dir.encoded}`, { dotfiles: "allow" });
		} else {
			console.log("The requested file %s doesn't exist", chalk.green(`'${dir.string}'`));
			utils.redirect(res, "/My%20Drive");
		}

	} else {
		console.log(chalk.redBright("The client is not logged in"));

		utils.redirect(res, "/My%20Drive");
	}
});

app.get("/*", (req, res) => {
	const isLoggedIn = res.locals.isLoggedIn;

	//Check if the client is logged in
	if (isLoggedIn) return res.sendFile(__dirname + '/client/home.html');

	res.sendFile(__dirname + '/client/login.html');
});

app.post("/new-folder/:dir", (req, res) => {
	const isLoggedIn = res.locals.isLoggedIn;
	const id = res.locals.id;

	if (isLoggedIn) {
		//Get username
		const username = utils.decode(sessions.get(id).state.username);

		//Get directory
		const dir = utils.getDirectory(req);

		//Check if directory was invalid JSON
		if (dir.err) return res.status(500).send(dir);

		//Create folder
		fileManager.createDirectory(`server/files/${username}/${dir.encoded}`);

		//Get files one directory up
		sendFiles(res, utils.encodeArray(dir.array.up()).join("/"));
	} else {
		console.log(chalk.redBright("The client is not logged in"));

		utils.redirect(res, "/My%20Drive", true /* JavaScript Redirect*/);
	}
});

app.post("/register", (req, res) => {
	const id = res.locals.id;

	//Parse form
	new formidable.IncomingForm().parse(req, (err, fields) => {
		//Check if the client is logged in
		if (res.locals.isLoggedIn) {
			sessions.logOut(id);

			utils.redirect(res, "/");
		} else {
			//If the password and username already exists
			let usernameExists = false;
			const loginsArray = Array.from(logins.data);

			loginsArray.forEach(login => {
				login = JSON.parse(login);

				if (login.username == fields.username) usernameExists = true;
			});

			if (!usernameExists) {
				//Encode username
				fields.username = utils.encode(fields.username);

				logins.add(fields);
				console.log("Succesfully registered account %s", chalk.green(`'${fields.username}'`));

				res.send(responsesManager.responses["registerSuccess"]);
			} else {
				console.log("Username %s already exists", chalk.green(`'${fields.username}'`));

				res.send(responsesManager.responses["registerAlreadyExists"]);
			}
		}
	});
});

app.post("/login*", (req, res) => {
	const id = res.locals.id;
	const url = req.url;

	//Parse form
	new formidable.IncomingForm().parse(req, (err, fields, files) => {
		//Check if the client is logged in
		if (res.locals.isLoggedIn) {
			console.log("The client is already logged in");

			utils.redirect(res, url.replaceAll("/login"));
		} else {
			//Encode username
			fields.username = utils.encode(fields.username);

			//If the password and username are correct
			if (logins.data.hasObject(fields)) {
				sessions.logIn(id, fields.username);
				console.log("Succesfully logged in account %s with the id %s", chalk.green(`'${fields.username}'`), chalk.green(`'${id}'`));

				utils.redirect(res, url.replaceAll("/login"), true /*JavaScript Redirect*/);
			} else {
				console.log("Invalid username or password");

				res.send(responsesManager.responses["invalidLogin"]);
			}
		}
	});
});

app.post("/logout*", (req, res) => {
	const id = res.locals.id;
	const isLoggedIn = res.locals.isLoggedIn;
	const url = req.url;

	if (isLoggedIn) sessions.logOut(id);

	utils.redirect(res, url.replaceAll("/logout"), true /*JavaScript Redirect*/);
});

app.post('/upload-file/:dir', (req, res) => {
	const isLoggedIn = res.locals.isLoggedIn;
	const id = req.cookies.id;

	if (isLoggedIn) {
		//Get username
		const username = utils.decode(sessions.get(id).state.username);

		//Get directory
		const dir = utils.getDirectory(req);

		//Check if directory was invalid JSON
		if (dir.err) return res.status(500).send(dir);

		//Parse form
		new formidable.IncomingForm().parse(req, (err, fields, files) => {
			const file = files.file;

			//Copy the file into the correct directory
			fileManager.copyFile(file, `server/files/${username}/${dir.encoded}`, utils.encode(file.name), err => {
				if (err) return;

				sendFiles(res, dir.encoded);
			});
		});
	} else
		utils.redirect(res, "/My%20Drive", true /*JavaScript Redirect*/);
});

app.post('/move-files/:dir', (req, res) => {
	const isLoggedIn = res.locals.isLoggedIn;
	const id = req.cookies.id;

	if (isLoggedIn) {
		//Get username
		const username = utils.decode(sessions.get(id).state.username);

		//Get directory
		const dir = utils.getDirectory(req);

		//Check if directory was invalid JSON
		if (dir.err) return res.status(500).send(dir);

		//Parse form
		new formidable.IncomingForm().parse(req, (err, fields) => {
			if (!fields.fileData.isValidJSON()) return utils.redirect(res, "/My%20Drive", true /*JavaScript Redirect*/);

			const json = JSON.parse(fields.fileData);
			const data = [];

			json.itemsToMove.forEach(item => {
				const targetPath = `server/files/${username}/${utils.encodeArray(JSON.parse(json.targetFolder.path).push(item.name)).join("/")}`;
				const sourcePath = `server/files/${username}/${utils.encodeArray(JSON.parse(item.path)).join("/")}`;

				//Add the source path
				data.push({ sourcePath: sourcePath, destinationPath: targetPath });
			});

			//Move the files
			fileManager.moveFiles(data, err => {
				if (err) {
					console.log(chalk.redBright(err));

					return res.send({ err: err });
				}

				console.log(chalk.cyan("Successfully moved files"));

				sendFiles(res, dir.encoded);
			});
		});
	} else 
	utils.redirect(res, "/My%20Drive", true /*JavaScript Redirect*/);
});