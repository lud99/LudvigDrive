class Session
{
	constructor(id, apiData = null)
	{
		this.id = id;
		this.clients = new Set;

		this.state = {
			isLoggedIn: false,
			username: ""
		};

		this.apiData = apiData
	}

	join(client)
	{
		if (client.session) {
			throw new Error("Client already in session");
		}
		this.clients.add(client);
		client.session = this;
	}

	leave(client)
	{
		if (client.session !== this) {
			throw new Error("Client not in session");
		}
		this.clients.delete(client);
		client.session = null;
	}
}

module.exports = Session;