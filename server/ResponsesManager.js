class ResponsesManager
{
	constructor(fileManager)
	{
		this.fileManager = fileManager;

		this.responses = {};

		this.load("./server/responses.json");
	}

	load(path)
	{	
		this.responses = JSON.parse(this.fileManager.readFileSync(path).toString());
	}
}

module.exports = ResponsesManager;