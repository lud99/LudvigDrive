const Session = require('./session');

class Sessions extends Map
{
	constructor() 
	{
		super();
	}

	createClient(conn, id = createId()) { return new Client(conn, id); }

	createSession(name = this.createId()) 
	{
		if (this.has(name)) {
			throw new Error(`Session ${name} already exists`);
		}

		const session = new Session(name);
		console.log("Creating", session);

		this.set(name, session);

		return session;
	}

	createSessionId(name = this.utils.createId()) 
	{
		if (this.has(name)) {
			throw new Error(`Session ${name} already exists`);
		}

		this.set(name, new ClientState());

		return name;
	}

	createSession(name = this.utils.createId()) 
	{
		if (this.has(name)) {
			throw new Error(`Session ${name} already exists`);
		}

		const session = new Session(name);
		console.log("Creating", session);

		this.set(name, session);

		return session;
	}

	getClient(username, id) {
		const clients = getClients(username);

		if (!clients) return;

		//Loop through all clients in session
		let match = false;
		clients.forEach(function(value1, value2, set) {
			if (id == value2.id) {
				match = value2;
			}
		});

		if (match) return match;
	} 

	getClients(username) 
	{
		const session = getSession(username);
		if (session) return session.clients;
	} 

	getSession(name) { return this.get(name); }

	logIn(id, username) 
	{
		this.get(id).state.isLoggedIn = true;
		this.get(id).state.username = username;
	}
}

module.exports = Sessions;