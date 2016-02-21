module.exports = function()
	{
	var isApplication = process.env.IS_REAL_SPACEIFY;
	return JSON.parse(require("fs").readFileSync((isApplication ? "/api/www/libs/" : "www/libs/") + "config.json", "utf8"));
	};