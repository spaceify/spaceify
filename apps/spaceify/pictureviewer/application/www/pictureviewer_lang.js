function Language()
{
	var self = this;

	/** TEXTS */
	// pictureviewer.html
	self.PICTUREVIEWER_BACKEND_CONNECTED = "Connected to Picture viewer backend";
	self.PICTUREVIEWER_BACKEND_CONNECTION_LOST = "Connection to Picture viewer backend lost";

	// Common
	self.ERROR_OBJECT = "ERROR: code=%0, message=%1";
	self.ERROR_STRING = "ERROR: message=%0";

	/** ERRORS */
	// pictureviewer.js
	self.E_NO_CONNECTION = {"code": 1001, "message": "No connection to the bigscreen."};

	// pictureviewer.html
	self.E_FIND_PICTUREVIEWER_BACKEND = {"code": 2000, "message": "Failed to find Picture viewer backend service:"};
	self.E_CONNECT_PICTUREVIEWER_BACKEND = {"code": 2001, "message": "Failed to connect to Picture viewer backend:"};

	/** METHODS */
	self.formatErrorString = function(lerr/*local*/, rerr/*remote*/)						// either {code, message} or string
	{
		var code  = (lerr.code ? lerr.code : "");
		var codesep = (code == "" ? "" : " - ");
		    code += (rerr && rerr.code ? codesep + rerr.code : "");

		var msge  = (lerr.message ? lerr.message : lerr);
		var msgesep = (msge == "" ? "" : " ");
		    msge += (rerr && rerr.message ? msgesep + rerr.message : (rerr ? msgesep + rerr : ""));

		return (code == "" ? format(self.ERROR_STRING, [msge]) : format(self.ERROR_OBJECT, [code, msge]));
	}

	var format = function(str, strs)
	{
		for(s in strs)																// replace %0, %1, ..., %strs.length - 1 with strings in the strs array
			str = str.replace("%" + s, strs[s]);
		return str;
	}
}

var language = new Language();
