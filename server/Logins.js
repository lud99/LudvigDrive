const JSONSet = require('./JSONSet');

class Logins
{
	constructor(fileManager, encryptDecrypt)
	{
		this.fileManager = fileManager;
		this.encryptDecrypt = encryptDecrypt;

		this.filePath = "server/logins.json";
		this.data = new JSONSet();

		this.load();
	}

	add(login) 
	{
		this.data.addObject(login);
		this.save();
	}

	load() 
	{
		this.fileManager.readFile(this.filePath, (data, err) => {
			if (err && !err.fileExists) {
				this.add({username: "dev", password: "dev"});
				return;
			}
			
			this.data = new JSONSet(JSON.parse(this.encryptDecrypt.decrypt(data)));
			console.log("Successfully loaded logins", this.data);
		});
	}

	save()
	{
		this.fileManager.writeFile(this.filePath, this.encryptDecrypt.encrypt(this.data.toJSON()), () => {
			console.log(this.data);
		});
	}
}

module.exports = Logins;