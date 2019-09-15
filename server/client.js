const EncryptDecrypt = require('./EncryptDecrypt');

class Client
{
	constructor(conn, id)
	{
		/*this.conn = conn;
		this.id = id;
		this.session = null;*/

		this.state = {
			loggedIn: false
		};
	}

	broadcast(data)
	{
		if (!this.session) {
			throw new Error("Can not broadcast without session");
		}

		data.clientId = this.id;

		this.session.clients.forEach(client => {
			if (this === client) {
				return;
			}

			client.send(data);
		});
	}

	send(data) 
	{
		const msg = JSON.stringify(data);
		const key = 101 + (Math.random() * 616 | 0);
		const encrypt = new EncryptDecrypt(key);

		const encrypted = encrypt.encrypt(msg);

		encrypt.key = 102;
		const keyEncrypted = encrypt.encrypt(JSON.stringify(key));
		const d = JSON.stringify({d: encrypted + keyEncrypted});
				
		console.log(`Sending message (decrypted) ${msg}`);

		this.conn.send(d, function ack(err) {
			if (err) {
				console.error("Message failed", msg, err);
			}
		});

		return true;
	}
}

module.exports = Client;