module.exports = function()
	{
	var isApplication = process.env.PORT_80;
	return JSON.parse(require("fs").readFileSync((isApplication ? "/api/www/libs/" : "www/libs/") + "config.json", "utf8"));
	};