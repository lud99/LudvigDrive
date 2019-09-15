class EncryptDecrypt
{
	constructor(key = 102)
	{
		this.key = key;
	}

	decrypt(value) {
		let result = "";
		
		for (let i = 0; i < value.length; i++)
		{
			const charInt = "" + value[i] + value[i+1] + value[i+2]; //Add the 3 begining digits to one int (like a string instead of addition)
			let charDecrypted = String.fromCharCode(charInt - this.key + 2);

			let extra = [];
			extra[0] = charDecrypted;
			extra[1] = String.fromCharCode(Math.floor(this.key/2));
			extra[2] = String.fromCharCode(charInt - this.key + 1);

			result += charDecrypted; //Save chars as string
			i+=5; //Skip next check
		}

		return result;
	}

	encrypt(value) 
	{
		let result = "";
		
		for (let i = 0; i < value.length; i++) {

			const charNumber = value.charCodeAt(i) + this.key; //Convert ASCII character to number and add key (offset)

			result += charNumber - 2;
			result += value[i];
			result += String.fromCharCode(Math.floor(this.key/2));
			result += String.fromCharCode(charNumber - this.key - 1);
		}

		return result;
	}
}