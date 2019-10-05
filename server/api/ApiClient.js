class ApiClient
{
	constructor()
	{
		this.state = {
			isLoggedIn: false,
			username: ""
		};
		
		this.data = {
			permissions: "read-only",
		}
	}
}

module.exports = ApiClient;