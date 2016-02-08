/**
 * Spaceify Utility by Spaceify Inc. 29.7.2015
 *
 * @class SpaceifyUtility
 */

function SpaceifyUtility()
{
var self = this;

	/* base64, source from: http://ntt.cc/2008/01/19/base64-encoder-decoder-with-javascript.html */
var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
self.encodeBase64 = function(input)
	{
	var output = "";
	var chr1, chr2, chr3 = "";
	var enc1, enc2, enc3, enc4 = "";
	var i = 0;

	do {
		chr1 = input.charCodeAt(i++);
		chr2 = input.charCodeAt(i++);
		chr3 = input.charCodeAt(i++);

		enc1 = chr1 >> 2;
		enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
		enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
		enc4 = chr3 & 63;

		if(isNaN(chr2))
			enc3 = enc4 = 64;
		else if (isNaN(chr3))
			enc4 = 64;

		output = output + keyStr.charAt(enc1) + keyStr.charAt(enc2) + keyStr.charAt(enc3) + keyStr.charAt(enc4);
		chr1 = chr2 = chr3 = "";
		enc1 = enc2 = enc3 = enc4 = "";
	} while (i < input.length);

	return output;
	}

self.decodeBase64 = function(input)
	{
	var output = "";
	var chr1, chr2, chr3 = "";
	var enc1, enc2, enc3, enc4 = "";
	var i = 0;

	if(!input)
		return "";

	// remove all characters that are not A-Z, a-z, 0-9, +, /, or =
	var base64test = /[^A-Za-z0-9\+\/\=]/g;
	if(base64test.exec(input))
		return -1;

	input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

	do {
		enc1 = keyStr.indexOf(input.charAt(i++));
		enc2 = keyStr.indexOf(input.charAt(i++));
		enc3 = keyStr.indexOf(input.charAt(i++));
		enc4 = keyStr.indexOf(input.charAt(i++));

		chr1 = (enc1 << 2) | (enc2 >> 4);
		chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
		chr3 = ((enc3 & 3) << 6) | enc4;

		output = output + String.fromCharCode(chr1);

		if(enc3 != 64)
			output = output + String.fromCharCode(chr2);
		if(enc4 != 64)
			output = output + String.fromCharCode(chr3);

		chr1 = chr2 = chr3 = "";
		enc1 = enc2 = enc3 = enc4 = "";
	} while (i < input.length);

	return unescape(output);
	}

	// COOKIES -- -- -- -- -- -- -- -- -- -- //
self.setCookie = function(cname, cvalue, expiration_sec)
	{
	var expires = "";

	if(expiration_sec)
		{
		var dn = Date.now() + (expiration_sec * 1000);
		var dc = new Date(dn);
		expires = "expires=" + dc.toGMTString();
		}

	document.cookie = cname + "=" + cvalue + (expires != "" ? "; " + expires : "");
	}

self.getCookie = function(cname)
	{
	var name = cname + "=";
	var ca = document.cookie.split(";");
	for(var i=0; i<ca.length; i++)
		{
		var c = ca[i];
		while(c.charAt(0) == " ")
			c = c.substring(1);

		if(c.indexOf(name) != -1)
			return c.substring(name.length, c.length);
		}

	return "";
	}

self.deleteCookie = function(cname)
	{
	document.cookie = cname + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
	}

	// ERRORS -- -- -- -- -- -- -- -- -- -- //
self.errorsToString = function(err)
	{ // Format error coming from Spaceify core or other sources to be displayable in web pages
	var errstr = "";

	if(typeof err == "string")
		errstr += err;
	else if(err.message)
		errstr += err.message;
	else if (err.pop /*=isArray*/)
		{
		while(err.length > 0)
			{
			var popped = err.shift();
			errstr += self.errorsToString(popped);
			}
		}
	else if(err.messages)
		{
		for(var i=0; i<err.messages.length; i++)
			errstr += (errstr != "" ? ", " : "") + err.messages[i];
		}
	else
		errstr = "";

	return errstr;
	}

self.combineErrors = function()
	{ // Combines several error string or objects to an array. The array can for example be passed to errorsToString.
	var errors = [];

	for(var i=0; i<arguments.length; i++)
		errors.push(arguments[i]);

	return errors;
	}

	// JSON -- -- -- -- -- -- -- -- -- -- //
self.parseJSON = function(str, throws)
	{
	var json;

	try {
		json = JSON.parse(str);
		}
	catch(err)
		{
		if(throws)
			throw {code: "utl1 json", message: "Failed to parse json.", path: ""};
		}

	return json;
	}

	// MISC -- -- -- -- -- -- -- -- -- -- //
self.extendClass = function(source, target)
	{ // Extend the target object (class) with the public methods from the source object
	for(i in source)
		{
		if(typeof source[i] == "function")
			target[i] = source[i];
		}
	}

self.extendClassSelected = function(source, target, selected)
	{ // Extend the target object (class) with the selected public methods from the source object
	for(i in source)
		{
		if(typeof source[i] == "function" && selected.indexOf(i) != -1)
			target[i] = source[i];
		}
	}

self.randomString = function(length, use_alpha)
	{ // http://stackoverflow.com/questions/10726909/random-alpha-numeric-string-in-javascript
	if(use_alpha)
		chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	else
		chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!£$#%&/(){}[]<>|§½=+?*,.;:-_";

	var result = "";
	for(var i = length; i > 0; --i)
		result += chars[Math.round(Math.random() * (chars.length - 1))];

	return result;
	}

}