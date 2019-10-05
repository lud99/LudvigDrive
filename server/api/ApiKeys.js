const FileManager = require('../FileManager');
const Utils = require("../Utils");

class ApiKeys
{
	constructor()
	{
		this.fileManager = new FileManager();
		this.utils = new Utils();

		this.data = new Map();
		this.filePath = "./server/api/apiKeys.json";

		this.load();
	}

	add(key, data) 
	{
		this.data.set(key, data);
		this.save();
	}

	load()  
	{
		this.fileManager.readFile(this.filePath, (data, err) => {

			if (err && !err.fileExists || data == "{}") {
				return this.add("dev", { key: this.utils.createId(), username: "dev" });
			}

			this.data = new Map(JSON.parse(data));
			console.log("Successfully loaded api keys", this.data);
		});
	}

	save()
	{
		this.fileManager.writeFile(this.filePath, JSON.stringify([...this.data]), () => {
			console.log(this.data);
		}); 
	}
}

module.exports = ApiKeys;