#!/usr/bin/env node
/**
 * Logger, 18.12.2013 Spaceify Inc.
 */

var fs = require("fs");
var config = require("./config")();
var language = require("./language");

function Logger()
{
var self = this;

var silent_file = true;
var silent_output = false;

var file_name = "debug.txt";

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

self.info = function(str, nolinefeed) { out(self.INFO, str, nolinefeed); }
self.error = function(str, nolinefeed) { out(self.ERROR, str, nolinefeed);  }
self.warn = function(str, nolinefeed) { out(self.WARN, str, nolinefeed); }
self.force = function(str, nolinefeed) { out(self.FORCE, str, nolinefeed); }

var out = function(level, str, nolinefeed)
	{
	if(typeof str == "undefined" || str == null)											// String doesn't have to provided, output nothing
		str = "";

	if(typeof str == "string")																// Replace "illegal" characters 0-9, 11-12, 14-31
		{
		str = str.replace(/[\x00-\x09\x0b-\x0c\x0e-\x1f\x7f-\xff]/g, "");
		//str = str.trim();
		}

	label = ((labels & level) ? label_str[level] : "");										// Show label only if allowed

	if(!silent_file && (levels & level))													// Output only if level is allowed, force is always allowed for stdout
		fs.appendFileSync(FILE_NAME, label + str + "\n");

	if((!silent_output && (levels & level)) || level == self.FORCE)
		process.stdout.write(label + str + (nolinefeed ? "" : "\n"));
	}

self.setOptions = function(options)
	{
	if(options.silent_file)
		silent_file = options.silent_file;
	if(options.silent_output)
		silent_output = options.silent_output;

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

module.exports = new Logger();
