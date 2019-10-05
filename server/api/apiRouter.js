const express = require('express');
const chalk = require('chalk');
const cookieParser = require('cookie-parser');

const router = express.Router();

const FileManager = require('../FileManager');
const ApiManager = require('./ApiManager');
const Utils = require('../Utils');

const fileManager = new FileManager();
const apiManager = new ApiManager();
const utils = new Utils();

router.use(cookieParser());
router.use(checkApiKey);

router.get("/auth", (req, res) => {
    const key = req.query.key;

    let username = "";
    
    //Get the username
    Array.from(apiManager.apiKeys.data).forEach(user => { if (user[1].key == key) username = user[1].username; });

    //If a username was found (the api key is valid)
    if (username) {
        //Create a session
        global.sessions.createApiSession(key, apiManager.apiClients.get(username));
        //And log in
        global.sessions.logIn(key, username);

        console.log("Succesfully logged in account %s with the Api key %s", chalk.green(`'${username}'`), chalk.green(`'${key}'`));

        res.send({success: true});
    } else {
        console.log("Invalid api key");
        
        res.send({success: false, err: "Invalid api key"});
    }
});

router.get("/getkey", (req, res) => {
    const id = req.cookies.id;

    //If the client is not logged in
    if (!utils.isLoggedIn(id)) return utils.redirect(res, "/", true /*JavaScript Redirect*/);

    const username = sessions.get(req.cookies.id).state.username;
 
    //Get the stored api key
    let keyObject = apiManager.apiKeys.data.get(username);

    //If the client doesn't have an api key
    if (!keyObject) {
        //Create a key
        const key = utils.createId();

        console.log("The client %s doesn't have an api key. Generating one now", chalk.green(`'${username}'`), chalk.green(`'${keyObject.key}'`));

        apiManager.apiKeys.add(username, { key: key, username: username });
    }

    console.log("Sending the api key %s to the client", chalk.green(`'${keyObject.key}'`), chalk.green(`'${username}'`))

    res.send({key: keyObject.key}); 
});

router.get("/files/:dir", (req, res) => {
    const key = res.locals.key;
    const isLoggedIn = res.locals.isLoggedIn;

	if (isLoggedIn) {
        //Get directory
        const dir = utils.getDirectory(req);

        //Check if directory wav invalid JSON
        if (dir.err) return res.status(500).send(dir);

        //Check permissions
        const permissions = global.sessions.get(key).apiData;

        let canReadDirectory;

        /* Iterate through all the directory permissions
        *  
        *  If a folder is found to be inaccessible, the 'found' variable is set to false.
        *  If a folder is found to be accessible, the 'found' variable is set to true.
        * 
        *  The variable can not be set to false once sat to true
        *  This is so that if a found subdirectory is accessible, but later the parent directory is found, which has the 
        *  don't allow subdirectories flag set.
        *
        */

        //Iterate through all allowed directories
        for (let i = 0; i < permissions.allowedDirectories.length; i++) {
            const directory = permissions.allowedDirectories[i];

            //Check if all files and directories can be accessed
            if (directory == "*") return sendFiles(res, dir.encoded);

            //If subdirectories of the directory can be accessed
            if (directory.allowSubDirectories) {
                const dirArrayCopy = dir.array.slice();

                //If in the same directory
                if (JSON.stringify(directory.name) == JSON.stringify(dir.array)) return sendFiles(res, dir.encoded);

                //FIgure out if the requested directory is in a subfolder of a allowed directory
                dirArrayCopy.splice(0, directory.name.length);

                //If in a sub folder of the allowed folder
                if (dirArrayCopy.length > 0) 
                    canReadDirectory = true;
                else if (!canReadDirectory) { //If not in a sub folder of the allowed folder, or in a unallowed folder
                    canReadDirectory = false;
                }
            } else {
                //If in the same directory
                if (JSON.stringify(directory.name) == JSON.stringify(dir.array)) 
                    canReadDirectory = true;
                else if (!canReadDirectory) { //If not in the same directory
                    canReadDirectory = false;
                }
            }
        }

        //If the client has access to the folder
        if (canReadDirectory) 
            sendFiles(res, dir.encoded);
        else //Send error
            res.send({err: "Not allowed to read directory", directory: dir.array})
	} else {
		console.log(chalk.redBright("The api client is not logged in"));

        res.send({err: "Not logged in"});
	}
});

router.get("/files/recursive/:dir", (req, res) => {
    const key = res.locals.key;
    const isLoggedIn = res.locals.isLoggedIn;

	if (isLoggedIn) {
        //Get directory
        const dir = utils.getDirectory(req);

        //Check if directory wav invalid JSON
        if (dir.err) return res.status(500).send(dir);

        //Get username
		const username = utils.decode(sessions.get(key).state.username);

        //Check permissions
        const permissions = global.sessions.get(key).apiData;

        let canReadDirectory;

        /* Iterate through all the directory permissions
        *  
        *  If a folder is found to be inaccessible, the 'found' variable is set to false.
        *  If a folder is found to be accessible, the 'found' variable is set to true.
        * 
        *  The variable can not be set to false once sat to true
        *  This is so that if a found subdirectory is accessible, but later the parent directory is found, which has the 
        *  don't allow subdirectories flag set.
        *
        */

        //Iterate through all allowed directories
        for (let i = 0; i < permissions.allowedDirectories.length; i++) {
            const directory = permissions.allowedDirectories[i];

            //Check if all files and directories can be accessed
            if (directory == "*") {
                canReadDirectory = true; break;
            }

            //If subdirectories of the directory can be accessed
            if (directory.allowSubDirectories) {
                const dirArrayCopy = dir.array.slice();

                //If in the same directory
                if (JSON.stringify(directory.name) == JSON.stringify(dir.array)) {
                    canReadDirectory = true; break;
                }

                //FIgure out if the requested directory is in a subfolder of a allowed directory
                dirArrayCopy.splice(0, directory.name.length);

                //If in a sub folder of the allowed folder
                if (dirArrayCopy.length > 0) 
                    canReadDirectory = true;
                else if (!canReadDirectory) { //If not in a sub folder of the allowed folder, or in a unallowed folder
                    canReadDirectory = false;
                }
            } else {
                //If in the same directory
                if (JSON.stringify(directory.name) == JSON.stringify(dir.array)) 
                    canReadDirectory = true;
                else if (!canReadDirectory) { //If not in the same directory
                    canReadDirectory = false;
                }
            }
        }

        //If the client has access to the folder
        if (canReadDirectory) {
            //Read the folder and all of its subfolders
            fileManager.readDirectoryRecursively(`server/files/${username}/${dir.encoded}`, files => {
                res.send(files);
            }, {
                rootDir: `server/files/${username}/`
            });
        }
        else //Send error
            res.send({err: "Not allowed to read directory", directory: dir.array})
	} else {
		console.log(chalk.redBright("The api client is not logged in"));

        res.send({err: "Not logged in"});
	}
});

function checkApiKey(req, res, next) {
    let key = req.query.key;
    if (!key && !req.url == "/getkey") return res.send( {err: "No api key specified"} );

    if (!utils.isLoggedIn(key)) {
        res.locals.isLoggedIn = false;
        
       return next();
    }

    res.locals.key = key;
    res.locals.isLoggedIn = utils.isLoggedIn(key);

    //Allow access from any domain
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

    next();
}

function sendFiles(res, dir) {
    const key = res.locals.key;

	//Get username
	const username = utils.decode(global.sessions.get(key).state.username);

	//Get files
	fileManager.readDirectory("server/files/" + username + "/" + dir, false /*Don't create folder if it doesn't exist*/, (err, items) => {
		if (err) {
			res.send({err: err});
			return console.log(err);
		} else {
			console.log("Files in %s: \n", chalk.green(`'${dir}'`), items);
			res.send({items: items});
		}
	}, { color: false, createDirectory: false });
}

String.prototype.replaceAll = function(str1, str2 = "") { return this.split(str1).join(str2) }
String.prototype.isValidJSON = function() { try { JSON.parse(this); } catch (e) { return false; } return true; }

module.exports = router;