class FileManager 
{

	constructor(fs) { this.fs = fs; }	


	createDirectory(path, recursive = true) { this.fs.mkdirSync(path, { recursive: recursive }); /*Create folder and (if specified) all its subfolders*/ }


	directoryExists(path, createDirectory)
	{
		if (createDirectory && !this.exists(path)) this.createDirectory(path); //Create the directory

		return this.exists(path);
	}

	copyFile(file, dir, name, callback)
	{
     	this.fs.copyFile(file.path, dir + "/" + name, err => {
		    if (err) return console.log(err);

	    	console.log("The file '%s' was successfully copied", name);

	    	if (callback) callback(err);
    	});
	}


	exists(path) { return this.fs.existsSync(path); }


	is(path, type = "directory") 
	{
		let exists = this.exists(path);
		let json = { exists: exists };

		if (exists) json.is = this.fs.lstatSync(path)["is" + type[0].toUpperCase() + type.slice(1).toLowerCase()]();

		return json;
	}


	isDirectory(path) { return this.is(path, "directory"); }


	isFile(path) { return this.is(path, "file"); }


	readDirectory(path, createDirectory, callback) 
	{
		let exists = this.directoryExists(path, createDirectory);

		if (!exists) return callback("The specified directory doesn't exist")

		this.fs.readdir(path, (err, items) => { 
			if (err) return console.log(err);

			let newItems = [];

			items.forEach(item => { newItems.push({ name: item, type: this.isFile(path + "/" + item).is ? "file" : "directory" }); });

			callback(false, newItems); 
		});
	}

	readFile(path, callback)
	{
		//If the file exists
		if (this.exists(path)) {
			//Read it
			this.fs.readFile(path, 'utf8', (err, data) => {
			    if (err) return console.log(err);

			    callback(data);
			});
		} else {
			callback(null, {fileExists: false});
			console.log("The file '%s' doesn't exist", path);
		}
	}

	readFileSync(path)
	{
		//If the file exists
		if (this.fileExistsSync(path)) {
			return this.fs.readFileSync(path, 'utf8');
		} else {
			console.log("The file '%s' doesn't exist", path);
			return {fileExists: false};
		}
	}

	writeFile(path, content, callback)
	{
		this.fs.writeFile(path, content, err => {
		    if (err) return console.log(err);

		    console.log("The file was successfully saved");
		    if (callback) callback();
		}); 
	}
}

module.exports = FileManager;