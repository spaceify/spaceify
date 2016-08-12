"use strict";

/**
 * SpaceifyError, 4.6.2014 Spaceify Oy
 */

function SpaceifyError(errObj)
{
// NODE.JS / REAL SPACEIFY - - - - - - - - - - - - - - - - - - - -
var isNodeJs = (typeof exports !== "undefined" ? true : false);
var isRealSpaceify = (typeof process !== "undefined" ? process.env.IS_REAL_SPACEIFY : false);
var apiPath = (isNodeJs && isRealSpaceify ? "/api/" : "/var/lib/spaceify/code/");

var classes = 	{
				SpaceifyConfig: (isNodeJs ? require(apiPath + "spaceifyconfig") : SpaceifyConfig)
				};
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

var self = this;

var config = new classes.SpaceifyConfig();

self.path = (errObj && errObj.path ? errObj.path : "");
self.code = (errObj && errObj.code ? errObj.code : "");
self.message = (errObj && errObj.message ? errObj.message : "");

	// CONSTANTS -- -- -- -- -- -- -- -- -- -- //
var CODE_SEPARATOR = ", ";
var PATH_SEPARATOR = ", ";
var MESSAGE_SEPARATOR = " ";

	// PUBLIC METHODS -- -- -- -- -- -- -- -- -- -- //
self.set = function(err)
	{
	self.path = err.path || "";
	self.code = err.code || "";
	self.message = err.message || "";
	}

self.getAsObject = function()
	{
	return {code: self.code, codes: [self.code], message: self.message, messages: [self.message], path: self.path, paths: [self.path]};
	}

self.getMessage = function()
	{
	return self.message;
	}

self.getCode = function()
	{
	return self.code;
	}

self.getPath = function()
	{
	return self.path;
	}

self.pre = function(path)
	{
	self.path = path;

	// There might be additional error objects after the path in the arguments: [path, err, err, ...]
	var args = Array.prototype.slice.call(arguments);
	// Pass this error object first (replace path with it) then the additional error objects: [thisError, err, err, ...]
	args[0] = self.getAsObject();

	return self.make.apply(this, args);
	}

self.preFmt = function(path, params)
	{
	self.path = path;

	return self.makeFmt(self.getAsObject(), params);
	}

	// ERRORS -- -- -- -- -- -- -- -- -- -- //
self.make = function()
	{
	var i;
	var path = "", paths = [];
	var code = "", codes = [];
	var message = "", messages = [];

	for(i = 0; i < arguments.length; i++)													// More than one error can be passed in the arguments
		{
		var aobj = arguments[i];

		if(aobj.messages)																	// concat arrays of paths, codes and messages, of the same size, to en existing error array
			{
			paths = paths.concat(aobj.paths);
			codes = codes.concat(aobj.codes);
			messages = messages.concat(aobj.messages);
			}
		else																				// push single error object to error array
			{
			paths.push(aobj.path ? aobj.path : "");
			codes.push(aobj.code ? aobj.code : "");
			messages.push(aobj.message ? aobj.message : aobj.toString());
			}
		}

	for(i = 0; i < messages.length; i++)													// Make single message, code and path strings
		{
		if(codes[i])
			code += (code != "" ? CODE_SEPARATOR : "") + codes[i];

		if(paths[i])
			path += (path != "" ? PATH_SEPARATOR : "") + paths[i];

		message += (message != "" ? MESSAGE_SEPARATOR : "") + messages[i];
		}

	return { code: code, message: message, path: path, codes: codes, paths: paths, messages: messages };
	}

self.makeFmt = function(err, params)
	{ // Make formatted error. This method handles only one error object
	err.message = self.replace(err.message, params);

	if(err.messages && err.messages.length > 0)
		err.messages[0] = err.message;

	return self.make(err);
	}

self.makeErrorObject = function(code, message, path)
	{
	var code_ = (typeof code != "undefined" ? code : "");
	var path_ = (typeof path != "undefined" ? path : "");
	var message_ = (typeof message != "undefined" ? message : "");

	return {code: code_, codes: [code_], message: message_, messages: [message_], path: path_, paths: [path_]};
	}

self.errorFromObject = function(eobj)
	{
	if(typeof eobj == "string")
		eobj = JSON.parse(eobj);

	return self.make(self.makeErrorObject(eobj.code, eobj.message, eobj.path));
	}

self.typeToErrorObject = function(err)
	{
	if(!err)
		err = self.makeErrorObject("###", "###", "###");
	else if(typeof err == "string")
		err = self.makeErrorObject("", err, "");
	else if(!err.codes && !err.messages && !err.paths)
		err = self.make(err);

	return err;
	}

self.errorToString = function(err, printPath, printCode)
	{ // Format an error object to a displayable string
	var errstr = "", code = "", path = "";

	if(typeof err == "string")
		errstr += err;
	else if(err.message && !err.messages)
		errstr += err.message;
	else if(err.pop)	// err instanceof isArray
		{
		while(err.length > 0)
			errstr += (errstr != "" ? MESSAGE_SEPARATOR : "") + self.errorToString(err.shift());
		}
	else if(err.messages)
		{
		for(var i = 0; i < err.messages.length; i++)							// Make simple error and code strings of the error arrays
			{
			code = (printCode && err.codes[i] ? err.codes[i] : null);
			path = (printPath && err.paths[i] ? err.paths[i] : null);

			errstr = (errstr != "" ? ", " : "");
			errstr += (path ? path : "");
			errstr += (code ? (path ? " - " : "") + code : "");
			errstr += (code || path ? " " : "") + err.messages[i];
			}
		}

	return errstr;
	}

self.replace = function(str, strs, replaceWith)
	{ // Replace all occurances of named tilde prefixed, alphanumerical parameters (e.g. :name, :Name1) supplied in the strs object in the str.
	var rw = (replaceWith ? replaceWith : "");

	for(var i in strs)
		{
		if(typeof strs[i] == "undefined")							// Don't replace parameters with undefined values
			continue;

		str = str.replace(i, strs[i]);
		}
																	// Remove unused parameters to tidy up the string
	str = str.replace(/\s~[a-zA-Z0-9]*\s/g, " " + rw + " ");		// ' ~x ' -> ' y '
	str = str.replace(/~[a-zA-Z0-9]*\s/g, " " + rw + " ");			// '~x '  -> ' y '
	str = str.replace(/\s~[a-zA-Z0-9]*/g, rw);						// ' ~x'  -> 'y'
	str = str.replace(/~[a-zA-Z0-9]+/g, rw);						// '~x'   -> 'y'

	return str;
	}

}

if(typeof exports !== "undefined")
	module.exports = SpaceifyError;
