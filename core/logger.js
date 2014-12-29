#!/usr/bin/env node
/**
 * Logger, 18.12.2013 Spaceify Inc.
 */

var fs = require("fs");
var Config = require("./config")();
var Utility = require("./utility");
var Language = require("./language");

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

self.info = function(str, literal) { out(self.INFO, str, literal); }
self.error = function(str, literal) { out(self.ERROR, str, literal);  }
self.warn = function(str, literal) { out(self.WARN, str, literal); }
self.force = function(str, literal) { out(self.FORCE, str, literal); }

var out = function(level, str, literal)
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
		process.stdout.write(label + str + (literal ? "" : "\n"));
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

}

module.exports = new Logger();
