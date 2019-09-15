class RequestManager
{
	static requestData(method, url, callback) 
	{
		const xhr = new XMLHttpRequest();
		xhr.open(method, url, true);
		xhr.onreadystatechange = function() {
		  	if (xhr.readyState === 4 && xhr.status === 200) {
		  		if (callback) callback(xhr.responseText);
	  		}
		}

		xhr.send();
	}

	static logout()
	{
		if (!confirm("Are you sure you want to log out? You will need to login again if you want to access your files")) return;

		this.requestData("POST", "/logout", response => {
			shouldDoRedirect(response);
		});
	}
}