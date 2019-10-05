const FileManager = require("../FileManager");
const ApiKeys = require('./ApiKeys');

class ApiManager
{
	constructor()
	{
		this.fileManager = new FileManager();
		this.apiKeys = new ApiKeys();

		this.apiClients = new Map();
		this.filePath = "./server/api/apiClients.json";

		this.load();
	}

	add(key) 
	{
		this.apiClients.set(key);
		this.save();
	}

	load() 
	{
		this.fileManager.readFile(this.filePath, (data, err) => {
			if (err && !err.fileExists) {
				this.add(JSON.stringify([["dev", {"permissions":"full-access","allowedDirectories": "*"}]]));
				return;
			}

			this.apiClients = new Map(JSON.parse(data));
			console.log("Successfully loaded Api clients", this.apiClients);
		});
	}

	save()
	{
		this.fileManager.writeFile(this.filePath, JSON.stringify(this.apiClients), () => {
			console.log(this.apiClients);
		});
	}
}

module.exports = ApiManager;