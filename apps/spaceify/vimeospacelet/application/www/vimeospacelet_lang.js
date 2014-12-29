function Language()
{
	var self = this;

	/** TEXTS */
	// vimeospacelet.js
	self.INFO_TITLE = "Play on Big Screen";
	self.PAUSED = "Paused";
	self.WAITING = "Waiting";
	self.DEFAULT_TIME = "--:--";
	self.TIME_SEP = ":";
	self.TITLE_SEP = " : ";

	// vimeospacelet.html
	self.VIMEO_BACKEND_CONNECTED = "Connected to vimeo backend";
	self.VIMEO_BACKEND_CONNECTION_LOST = "Connection to vimeo backend lost";

	// Common
	self.ERROR_OBJECT = "ERROR: code=%0, message=%1";
	self.ERROR_STRING = "ERROR: message=%0";

	/** ERRORS */
	// vimeo.js
	self.E_UNKNOWN_VIDEO_ID = {"code": 1000, "message": "Unknown video id."};
	self.E_NO_CONNECTION = {"code": 1001, "message": "No connection to the bigscreen."};

	// vimeospacelet.html
	self.E_FIND_VIMEO_BACKEND = {"code": 2000, "message": "Failed to find vimeo backend service:"};
	self.E_CONNECT_VIMEO_BACKEND = {"code": 2001, "message": "Failed to connect to vimeo backend:"};

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
