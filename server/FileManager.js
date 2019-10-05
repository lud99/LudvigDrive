const chalk = require("chalk");
const find = require('find');

class FileManager 
{
	constructor() {this.fs = require('fs-extra'); this.sanitize = require('sanitize-filename'); }	

	createDirectory(path, recursive = true) 
	{ 
		const pathRoot = path.split("/").slice(0, -1).join("/");
		const fileName = this.sanitize(path.split("/").slice(-1).join("/"));

		this.fs.mkdirSync(pathRoot + "/" + fileName, { recursive: recursive }); /*Create folder and (if specified) all its subfolders*/ 
	}

	copyFile(file, dir, name, callback)
	{
		console.log(chalk.cyan("Copying file '" + name + "'..."));

     	this.fs.copyFile(file.path, dir + "/" + this.sanitize(name), err => {
		    if (err) return console.log(err);

	    	console.log(chalk.cyan("The file '" + name + "' was successfully copied"));

	    	if (callback) callback(err);
    	});
	}

	directoryExists(path, createDirectory)
	{
		const pathRoot = path.split("/").slice(0, -1).join("/");
		const fileName = this.sanitize(path.split("/").slice(-1).join("/"));

		path = pathRoot + "/" + fileName;

		if (createDirectory && !this.exists(path)) this.createDirectory(path); //Create the directory

		return this.exists(path);
	}


	exists(path) {return this.fs.existsSync(path); }


	is(path, type = "directory") 
	{	
		let exists = this.exists(path);
		let json = { exists: exists };

		if (exists) json.is = this.fs.lstatSync(path)["is" + type[0].toUpperCase() + type.slice(1).toLowerCase()]();

		return json;
	}


	isDirectory(path) { return this.is(path, "directory"); }


	isFile(path) { return this.is(path, "file"); }


	move(sourcePath, destinationPath, callback, options = { overwrite: true })
	{
		this.fs.move(sourcePath, destinationPath, options, err => {
	  		if (err) callback(err)

			callback(err);
		});
	}

	moveFiles(files = [{sourcePaths: "", destinationPaths: ""}], callback, options = { overwrite: true })
	{
		let numberOfFilesDone = 0;

		files.forEach((file, i) => {
			this.move(file.sourcePath, file.destinationPath, err => { 
				numberOfFilesDone += 1; 

				if (numberOfFilesDone == files.length) callback(err);
			}, options);
		});
	}


	readDirectory(path, createDirectory, callback, options = { color: true }) 
	{
		const pathRoot = path.split("/").slice(0, -1).join("/");
		const fileName = this.sanitize(path.split("/").slice(-1).join("/"));

		path = pathRoot + "/" + fileName;

		let exists = this.directoryExists(path, createDirectory);

		if (!exists) return callback(options.color ? chalk.redBright("The specified directory doesn't exist") : "The specified directory doesn't exist");

		this.fs.readdir(path, (err, items) => { 
			if (err) return console.log(err);

			let newItems = [];

			items.forEach(item => { newItems.push({ name: item, type: this.isFile(path + "/" + item).is ? "file" : "directory" }); });

			callback(false, newItems); 
		});
	}

	readDirectoryRecursively(dir, callback, options = { rootDir: "" })
	{
		let result = [];

		let filesDone, directoriesDone;

		//Find all files
		find.eachfile(dir, file => {
			//Replace all the double backslahes ('\\') with single forward ones ('/') and remove the root directory
			const fileDir = file.replaceAll("\\", "/").replaceAll(options.rootDir);

			//Convert the directory into an array
			const dirArray = fileDir.split("/");
			const name = dirArray.slice(-1)[0];
			
			result.push({dir: dirArray.slice(0, -1) /* Get all the elements except the last one (the filename) */, type: "file", name: name});
		})
		.end(() => {
			filesDone = true;
			if (directoriesDone) callback(result)
		});
		
		//Find all directories
		find.eachdir(dir, directory => {
			//Replace all the double backslahes ('\\') with single forward ones ('/') and remove the root directory
			const directoryDir = directory.replaceAll("\\", "/").replaceAll(options.rootDir);

			//Convert the directory into an array
			const dirArray = directoryDir.split("/");
			const name = dirArray.slice(-1)[0];
			
			result.push({dir: dirArray.slice(0, -1) /* Get all the elements except the last one (the filename) */, type: "directory", name: name});
		})
		.end(() => {
			directoriesDone = true;
			if (filesDone) callback(result);
		});
	}

	readFile(path, callback)
	{
		const pathRoot = path.split("/").slice(0, -1).join("/");
		const fileName = this.sanitize(path.split("/").slice(-1).join("/"));

		path = pathRoot + "/" + fileName;

		//If the file exists
		if (this.exists(path)) {
			//Read it
			this.fs.readFile(path, 'utf8', (err, data) => {
			    if (err) return console.log(err);

			    callback(data);
			});
		} else {
			callback(null, { fileExists: false });

			console.log(chalk.redBright("The file '" + path + "' doesn't exist"));
		}
	}

	readFileSync(path)
	{
		const pathRoot = path.split("/").slice(0, -1).join("/");
		const fileName = this.sanitize(path.split("/").slice(-1).join("/"));

		path = pathRoot + "/" + fileName;

		//If the file exists
		if (this.exists(path)) {
			return this.fs.readFileSync(path, 'utf8');
		} else {
			console.log(chalk.redBright("The file '" + path + "' doesn't exist"));

			return { fileExists: false };
		}
	}

	remove(path, callback)
	{
		const pathRoot = path.split("/").slice(0, -1).join("/");
		const fileName = this.sanitize(path.split("/").slice(-1).join("/"));

		path = pathRoot + "/" + fileName;

		if (this.isFile(path)) removeFile(path, callback);
		else this.removeDirectory(path, callback);
	}

	removeDirectory(path, recursive = true, callback)
	{
		const pathRoot = path.split("/").slice(0, -1).join("/");
		const fileName = this.sanitize(path.split("/").slice(-1).join("/"));

		path = pathRoot + "/" + fileName;

		console.log(chalk.cyan("Removing directory '" + fileName + "'..."));

		this.fs.rmdir(path, { recursive: recursive }, err => {
		  	if (err) throw err;
		  	
		    console.log(chalk.cyan("The directory was successfully removed"));

		    if (callback) callback();
		});
	}


	removeFile(path, callback)
	{
		const pathRoot = path.split("/").slice(0, -1).join("/");
		const fileName = this.sanitize(path.split("/").slice(-1).join("/"));

		path = pathRoot + "/" + fileName;

		console.log(chalk.cyan("Removing file '" + fileName + "'..."));

		this.fs.unlink(path, err => {
		  	if (err) throw err;
		  	
		    console.log(chalk.cyan("The file was successfully removed"));

		    if (callback) callback();
		});
	}

	writeFile(path, content, callback)
	{
		const pathRoot = path.split("/").slice(0, -1).join("/");
		const fileName = this.sanitize(path.split("/").slice(-1).join("/"));

		path = pathRoot + "/" + fileName;

		this.fs.writeFile(path, content, err => {
		    if (err) return console.log(err);

		    console.log(chalk.cyan("The file was successfully saved"));
		    if (callback) callback();
		}); 
	}
}

module.exports = FileManager;