/**
 * Logger, 18.12.2013 Spaceify Inc.
 *
 * @class Logger
 */

function Logger()
{
var self = this;

var isNodeJS = (typeof exports !== "undefined" ? true : false);

if(isNodeJS)
	{
	var api_path = process.env.IS_REAL_SPACEIFY ? "/api/" : "/var/lib/spaceify/code/";

	var fs = require("fs");
	var config = require(api_path + "config")();
	}
else
	{
	var config = new SpaceifyConfig();
	}

	// -- -- -- -- -- -- -- -- -- -- //
var write_to_file = false;
var write_to_console = true;

var file_name = "/tmp/debug.txt";

self.INFO = 1;
self.ERROR = 2;
self.WARN = 4;
self.FORCE = 8;

var label_str = {};
label_str[self.INFO] = "INFO: ";
label_str[self.ERROR] = "ERROR: ";
label_str[self.WARN] = "WARNING: ";
label_str[self.FORCE] = "";
var labels = self.INFO | self.ERROR | self.WARN | self.FORCE;

var levels = self.INFO | self.ERROR | self.WARN | self.FORCE;

self.info = function() { out(self.INFO, arguments); }
self.error = function() { out(self.ERROR, arguments);  }
self.warn = function() { out(self.WARN, arguments); }
self.force = function() { out(self.FORCE, arguments); }

var out = function(level)
	{
	strs = arguments[1];

	var str = "";																			// Concatenate strings, separate strings with space
	for(var i=0; i<strs.length; i++)
		str += (strs[i] ? strs[i] + (i != strs.length - 1 ? "'" : "") : "");

	if(typeof str == "string")																// Replace "illegal" characters 0-9, 11-12, 14-31, 127-end of UNICODE
		str = str.replace(/[\x00-\x09\x0b-\x0c\x0e-\x1f\u007f-\uffff]/g, "");

	label = ((labels & level) ? label_str[level] : "");										// Show label only if allowed

	if(isNodeJS && write_to_file && (levels & level))
		fs.appendFileSync(file_name, label + str + "\n");

	if((write_to_console && (levels & level)) || level == self.FORCE)
		{
		txt = label + str;
		isNodeJS ? process.stdout.write(txt + "\n") : console.log(txt);
		}
	}

self.setOptions = function(options)
	{
	if(options.write_to_file)
		write_to_file = options.write_to_file;
	if(options.write_to_console)
		write_to_console = options.write_to_console;

	if(options.info_label)
		labels[self.INFO] = options.info_label;
	if(options.error_label)
		labels[self.ERROR] = options.error_label;
	if(options.warn_label)
		labels[self.WARN] = options.warn_label;
	if(options.force_label)
		labels[self.FORCE] = options.force_label;

	if(options.labels)
		labels = options.labels;

	if(options.file_name)
		file_name = options.file_name;

	if(options.levels)
		levels = options.levels;
	}

self.printErrors = function(err, print_path, print_code, print_type)
	{
	var message = "";

	if(err.messages)
		{
		for(var i=0; i<err.messages.length; i++)
			{
			var path = (err.paths[i] ? err.paths[i] + " - " : "");
			var code = (err.codes[i] ? "(" + err.codes[i] + ") " : "");
			message += (message != "" ? config.MESSAGE_SEPARATOR : "") + (print_path ? path : "") + (print_code ? code : "") + err.messages[i];
			}
		}
	else if(err.message)
		message = (err.code && print_code ? "(" + err.code + ") " : "") + err.message;

	if(print_type == 0)
		self.error(message);
	else if(print_type == 1)
		self.force(message);

	return message;
	}

}

if(typeof exports !== "undefined")
	module.exports = new Logger();
