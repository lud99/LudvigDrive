const chalk = require("chalk");

class Utils 
{
	constructor()
	{
		this.sessions = global.sessions;
	}

	createId(len = 64, chars = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ') 
	{
		let id = "";
		while (len--) {
			id += chars[Math.random() * chars.length | 0];
		}
		return id;
	}

	createSession(name = this.createId()) 
	{
		if (this.sessions.has(name)) {
			throw new Error(`Session ${name} already exists`);
		}

		const session = new Session(name);
		console.log("Creating", session);

		this.sessions.set(name, session);

		return session;
	}

	createApiSession(name = this.createId()) 
	{
		if (this.sessions.has(name)) {
			throw new Error(`Session ${name} already exists`);
		}

		const session = new Session(name, true);
		console.log("Creating Api", session);

		this.sessions.set(name, session);

		return session;
	}

	encode(string) { return encodeURIComponent(decodeURIComponent(string)); }

	encodeArray(array) 
	{ 
		let res = [];

		array.forEach(item => res.push(this.encode(item)));

		return res;
	}

	decodeArray(array) 
	{ 
		let res = [];

		array.forEach(item => res.push(this.decode(item)));

		return res;
	}

	decode(string) { return decodeURIComponent(string); }

	getSession(name) { return this.sessions.get(name); }

	hasValidId(id) { return this.sessions.has(id); }

	isLoggedIn(id) 
	{
		const session = this.getSession(id);

		if (!session) return false;

		return session.state.isLoggedIn;
	}

	createCookie(res) 
	{
		const id = this.createId();
		const session = this.sessions.createSession(id);

		console.log(chalk.redBright("The client does not have a valid id, generating one now ") + chalk.green("'" + id + "'"));
		let options = {
	        maxAge: 1000 * 60 * 15 //Expires after 15 minutes
	    }

	    //Set the cookie
	    res.cookie('id', id, options);

	    return id;
	}
	
	getDirectory(req) 
	{
		if (!req.params.dir || !req.params.dir.isValidJSON()) return { err: "Invalid JSON" };
		
		const dirArray = JSON.parse(req.params.dir);

		return {
			array: dirArray,
			string: dirArray.join("/"), 
			encoded: this.encodeArray(dirArray).join("/")
		}
	}

	redirect(res, url = "/", jsRedirect) 
	{
		console.log("Redirecting to %s", chalk.green("'" + url + "'"));

		//Redirect with javascript
		if (jsRedirect) res.send({newURL: url});
		//Redirect with html
		else res.redirect(url);
	}
}

module.exports = Utils;