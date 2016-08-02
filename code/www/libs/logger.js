"use strict";

/**
 * Logger, 18.12.2013 Spaceify Oy
 *
 * @class Logger
 */

function Logger()
{
// NODE.JS / REAL SPACEIFY - - - - - - - - - - - - - - - - - - - -
var isNodeJs = (typeof exports !== "undefined" ? true : false);
var isRealSpaceify = (typeof process !== "undefined" ? process.env.IS_REAL_SPACEIFY : false);
var apiPath = (isNodeJs && isRealSpaceify ? "/api/" : "/var/lib/spaceify/code/");

var classes = 	{
				SpaceifyError: (isNodeJs ? require(apiPath + "spaceifyerror") : SpaceifyError),
				SpaceifyConfig: (isNodeJs ? require(apiPath + "spaceifyconfig") : SpaceifyConfig)
				};
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

var self = this;

var errorc = new classes.SpaceifyError();
var config = new classes.SpaceifyConfig();

var output = true;

var fileName = "/tmp/debug.txt";

self.INFO = 1;
self.ERROR = 2;
self.WARN = 4;
self.FORCE = 8;
self.RETURN = 16;

var labelStr = {};
labelStr[self.INFO] = "[i] ";
labelStr[self.ERROR] = "[e] ";
labelStr[self.WARN] = "[w] ";
labelStr[self.FORCE] = "";
var labels = self.INFO | self.ERROR | self.WARN | self.FORCE;

var levels = self.INFO | self.ERROR | self.WARN | self.FORCE;

self.info = function() { out(self.INFO, arguments); }
self.error = function() { printErrors.apply(this, arguments); }
self.warn = function() { out(self.WARN, arguments); }
self.force = function() { out(self.FORCE, arguments); }

var out = function(level)
	{
	var strp, strs = arguments[1];

	var str = "";																			// Concatenate strings passed in the arguments, separate strings with space
	for(var i = 0; i < strs.length; i++)
		{
		strp = (typeof strs[i] == "string" ? strs[i] : JSON.stringify(strs[i]));
		str += (str != "" && str != "\n" && str != "\r" && str != "\r\n" ? " " : "") + strp;
		}

	if(typeof str == "string")																// Replace control characters 0-9, 11-12, 14-31
		str = str.replace(/[\x00-\x09\x0b-\x0c\x0e-\x1f]/g, "");

	var label = ((labels & level) ? labelStr[level] : "");									// Show label only if allowed

	if((output && (levels & level)) || level == self.FORCE)
		{
		var txt = label + str;
		isNodeJs ? process.stdout.write(txt + "\n") : console.log(txt);
		}
	}

var printErrors = function(err, printPath, printCode, printType)
	{
	var message = errorc.errorToString(err, printPath, printCode);

	if(printType == self.ERROR)
		out.call(self, self.ERROR, [message]);
	else if(printType == self.FORCE)
		self.force(message);

	return message;
	}

self.setOptions = function(options)
	{
	if(options.hasOwnProperty("output"))
		output = options.output;

	if(options.hasOwnProperty("infoLabel"))
		labels[self.INFO] = options.infoLabel;
	if(options.hasOwnProperty("errorLabel"))
		labels[self.ERROR] = options.errorLabel;
	if(options.hasOwnProperty("warnLabel"))
		labels[self.WARN] = options.warnLabel;
	if(options.hasOwnProperty("forceLabel"))
		labels[self.FORCE] = options.forceLabel;

	if(options.hasOwnProperty("labels"))
		labels = options.labels;

	if(options.hasOwnProperty("fileName"))
		fileName = options.fileName;

	if(options.hasOwnProperty("levels"))
		levels = options.levels;
	}

}

if(typeof exports !== "undefined")
	module.exports = Logger;
