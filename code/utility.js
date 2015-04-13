#!/usr/bin/env node
/**
 * utility, 18.9.2013 Spaceify Inc.
 * 
 * @class utility
 */

var os = require("os");
var fs = require("fs");
var path = require("path");
var mkdirp = require("mkdirp");
var AdmZip = require("adm-zip");
var fibrous = require("fibrous");
var request = require("request");
var spawn = require("child_process").spawn;
var Language = require("./language");
var Config = require("./config")();
var SpaceifyError = require("./spaceifyerror");

function utility()
{
var self = this;

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// FILE  // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.loadRemoteFile = fibrous( function(fileUrl)
	{
	var result;
	try	{
		result = request.sync.get(fileUrl, { encoding: null, rejectUnauthorized: false, agent: false });
		}
	catch(err)
		{
		throw self.error(Language.E_FAILED_TO_INITIATE_HTTP_GET.p("Utility::loadRemoteFile"), err);
		}

	if(result.statusCode != 200)
		throw self.ferror(Language.E_FAILED_TO_LOAD_REMOTE_FILE.p("Utility::loadRemoteFile"), {":file": fileUrl, ":code": result.statusCode});

	return result;
	});

self.loadRemoteFileToLocalFile = fibrous( function(fileUrl, targetDir, targetFile, bThrows) 
	{
	try {
		var result = self.sync.loadRemoteFile(fileUrl);

		if(result.statusCode == 200)
			self.sync.writeFile(targetDir, targetFile, result.body);

		return true;
		}
	catch(err)
		{
		if(bThrows)
			throw self.error(Language.E_LOAD_REMOTE_FILE_TO_LOCAL_FILE.p("Utility::loadRemoteFileToLocalFile"), err);
		}

	return false;
	});

self.isLocal = fibrous( function(filepath, type)
	{
	try {
		var stats = fs.sync.stat(filepath);
		if(stats && type == "file" && stats.isFile())
			return true;
		else if(stats && type == "directory" && stats.isDirectory())
			return true;
		}
	catch(err)
		{}

	return false;
	});

self.deleteDirectory = fibrous( function(source, bThrows)						// Recursively deletes directory and its files and subdirectories
	{
	try {
		var stats = fs.sync.stat(source);
		if(typeof stats != "undefined" && stats.isDirectory())
			{
			fs.sync.readdir(source).forEach(function(file, index)
				{
				var curPath = source + "/" + file;
				if(fs.sync.stat(curPath).isDirectory())
					self.sync.deleteDirectory(curPath, bThrows);
				else
					fs.sync.unlink(curPath);
				});

			fs.sync.rmdir(source);
			}
		}
	catch(err)
		{
		if(bThrows)
			throw self.error(Language.E_DELETE_DIRECTORY.p("Utility::deleteDirectory"), err);
		}
	});

self.copyDirectory = fibrous( function(source, target, bThrows)
	{ // Recursively copy source directory content to target directory.
	try {
		var stats = fs.sync.stat(source);
		if(typeof stats == "undefined" || !stats.isDirectory()) return;

		var mode = parseInt("0" + (stats.mode & 0777).toString(8), 8);

		mkdirp.sync(target, mode);

		fs.sync.readdir(source).forEach(function(file, index)
			{
			var sourcePath = source + file;
			var targetPath = target + file;

			stats = fs.sync.stat(sourcePath);
			if(stats.isDirectory())
				{
				self.sync.copyDirectory(sourcePath + "/", targetPath + "/", bThrows);
				}
			else
				{
				mode = parseInt("0" + (stats.mode & 0777).toString(8), 8);
				var readStream = fs.createReadStream(sourcePath, {"autoClose": true});
				var writeStream = fs.createWriteStream(targetPath, {"mode": mode});
				readStream.pipe(writeStream);
				}
			});
		}
	catch(err)
		{
		if(bThrows)
			throw self.error(Language.E_COPY_DIRECTORY.p("Utility::copyDirectory"), err);
		}
	});

self.moveDirectory = fibrous( function(source, target, bThrows)
	{
	try {
		self.sync.copyDirectory(source, target, true);
		self.sync.deleteDirectory(source, true);
		}
	catch(err)
		{
		if(bThrows)
			throw self.error(Language.E_MOVE_DIRECTORY.p("Utility::moveDirectory"), err);
		}
	});

self.deleteFile = fibrous( function(source, bThrows)
	{
	try {
		var stats = fs.sync.stat(source);
		if(typeof stats != "undefined" && !stats.isDirectory())
			fs.sync.unlink(source);
		}
	catch(err)
		{
		if(bThrows)
			throw self.error(Language.E_DELETE_FILE.p("Utility::deleteFile"), err);
		}
	});

self.copyFile = fibrous( function(sourceFile, targetFile, bThrows)
	{
	try {
		var stats = fs.sync.stat(sourceFile);
		if(typeof stats != "undefined" && !stats.isDirectory())
			{
			var mode = parseInt("0" + (stats.mode & 0777).toString(8), 8);
			var readStream = fs.createReadStream(sourceFile, {"autoClose": true});
			var writeStream = fs.createWriteStream(targetFile, {"mode": mode});
			readStream.pipe(writeStream);
			}
		}
	catch(err)
		{
		if(bThrows)
			throw self.error(Language.E_COPY_FILE.p("Utility::copyFile"), err);
		}
	});

self.moveFile = fibrous( function(sourceFile, targetFile, bThrows)
{
	try {
		self.sync.copyFile(sourceFile, targetFile, true);
		self.sync.deleteFile(sourceFile, true);
		}
	catch(err)
		{
		if(bThrows)
			throw self.error(Language.E_MOVE_FILEE.p("Utility::moveFile"), err);
		}
});

self.zipDirectory = fibrous( function(source, zipfile)				// Craete a zip file from the contents of the source directory
	{
	source = source + (source != "" && source.search(/\/$/) == -1 ? "/" : "");

	try {
		var log = console.log;										// Disable console.log for a while, bacuse adm-zip prints directory content unnecessarily
		console.log = function() {};

		var zip = new AdmZip();
		zip.addLocalFolder(source);
		zip.writeZip(zipfile);

		console.log = log;
		}
	catch(err)
		{
		console.log(err);
		}
	});

self.getFileFromZip = function(zipFilename, filename, extractPath, deleteAfter)
	{ // Get a text file from a zip file. Extracts file to the extractPath if path is defined. Deletes archive if requested.
	var regex = new RegExp(filename + "$", "i");
	var zip = new AdmZip(zipFilename);
	var zipEntries = zip.getEntries();
	for(ze in zipEntries)
		{
		if(zipEntries[ze].entryName.search(regex) != -1)
			{
			if(extractPath)
				zip.extractAllTo(extractPath, true);

			return zip.readAsText(zipEntries[ze].entryName);
			}
		}

	if(deleteAfter)
		self.sync.deleteFile(zipFilename);
	
	return null;
	}

self.unZip = function(zipFilename, extractPath, deleteAfter)
	{ // Extracts archive to extractPath. Deletes archive if requested.
	var zip = new AdmZip(zipFilename);
	zip.extractAllTo(extractPath, true);

	if(deleteAfter)
		self.sync.deleteFile(zipFilename);

	return true;
	}

self.writeFile = fibrous( function(targetDir, targetFile, data)
	{
	mkdirp.sync(targetDir);

	fs.sync.writeFile(targetDir + targetFile, data);
	});

self.preparePath = function(directory)
	{ // Add / at the end of path, if it is not empty and doesn't have it already
	return directory + (!directory.match(/^$/) && !directory.match(/\/$/) ? "/" : "");	// Not empty, doesn't end with /
	}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// WWW / NETWORK  // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.postForm = fibrous( function(url, form)
	{
	var result;
	try	{
		result = request.sync.post(url, form);
		}
	catch(err)
		{
		throw self.error(Language.E_FAILED_TO_INITIATE_HTTP_POST.p("Utility::postForm"), err);
		}

	if(result.statusCode != 200)
		throw self.ferror(Language.E_FAILED_TO_POST_FORM.p("Utility::postForm"), {":url": url, ":code": result.statusCode});

	return result;
	});

self.remakeGET = function(get, exclude, include)
	{ // exclude=remove from search, include=add to search. Hint, use exlude and include in connection if you want replace values, e.g. exclude=["splash"], include={"splash": "action"}.
	var search = "";

	for(i in get)
		{
		if(!exclude.indexOf(i))
			search += (search != "" ? "&" : "") + i + "=" + get[i];
		}

	for(i in include)
		search += (search != "" ? "&" : "") + i + "=" + include[i];

	return "?" + search;
	}

self.postPublish = function(package, username, password, release_name, callback)
	{
	require("./logger").force(Language.POSTING_PACKAGE);

	request({
		url: Config.REGISTRY_PUBLISH_URL,
		headers: { "content-type" : "multipart/form-data" },
		method: "POST",
		multipart:
			[
				{ "Content-Disposition" : 'form-data; name="username"', body: username },
				{ "Content-Disposition" : 'form-data; name="password"', body: password },
				{ "Content-Disposition" : 'form-data; name="release"', body: release_name },
				{
				"Content-Disposition" : 'form-data; name="package"; filename="' + Config.PUBLISHZIP + '"',
				"Content-Type" : "application/zip",
				body: fs.readFileSync(package)
				}
			]
		},
		function(err, result, body)
			{
			callback(err ? err : null, err ? null : (result.statusCode != 200 ? result.statusCode : body));
			});
	}

self.isIPInEdgeNetwork = function(ip)
	{ // Is ip in edge network
	var ddp = ip.split(".");
	if(ddp.length != 4)
		return false;
	
	ip = ((+ddp[0]) << 24) + ((+ddp[1]) << 16) + ((+ddp[2]) << 8) + (+ddp[3]);
	return (ip & Config.EDGE_NETMASK.binary != Config.EDGE_NETWORK.binary ? false : true)
	}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// ERRORS   // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.error = function(/* errors are in the last arguments!!! */)
	{
	var path, paths = [];
	var code, codes = [];
	var message = "", messages = [];
	for(var i=0; i<arguments.length; i++)																// More than one error can be passed in the arguments
		{
		var aobj = arguments[i];
		if(aobj.messages)																				// concat arrays of paths, codes and messages, of the same size, to en existing error array
			{
			paths = paths.concat(aobj.paths);
			codes = codes.concat(aobj.codes);
			messages = messages.concat(aobj.messages);
			}
		else																							// push single error object to error array
			{
			paths.push(aobj.path ? aobj.path : "");
			codes.push(aobj.code ? aobj.code : "");
			messages.push(aobj.message ? aobj.message : aobj.toString());
			}
		}

	for(var i=0; i<messages.length; i++)																// Make a simple error string of the error arrays
		{
		code = (codes[i] ? "(" + codes[i] + ") " : "");

		message += (message != "" ? ", " : "") + code + messages[i];
		}

	return { codes: codes, paths: paths, messages: messages, message: message };
	}

self.ferror = function(err, params)
	{ // Formatted error messages
	err.message = self.replace(err.message, params);

	return self.error(err);
	}

self.printErrors = function(err)
	{
	var message = "";
	if(err.messages)
		{
		for(var i=0; i<err.messages.length; i++)
			{
			var path = (err.paths[i] ? err.paths[i] + "->" : "");
			var code = (err.codes[i] ? "(" + err.codes[i] + ") " : "");
			message += (message != "" ? ", " : "") + path + code + err.messages[i];
			}
		}
	else
		message = (err.code ? "(" + err.code + ")" : "") + err.message;

	require("./logger").error(message);
	}

self.makeError = function(code, message, path)
	{
	return new SpaceifyError({code: code, message: message, path: path});
	}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// SERVICE  // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.makeServices = function(unique_name, services, ports, ip)
	{
	var mservices = [];
	for(var i=0; i<services.length; i+=2)
		mservices.push({"unique_name": unique_name, "service_name": services[i].service_name, "service_type": services[i].service_type, "port": ports[i], "secure_port": ports[i + 1], "ip": ip, "registered": false});

	mservices.push({"unique_name": unique_name, "service_name": Config.HTTP_SERVICE, "service_type": Config.HTTP_SERVICE, "port": ports[ports.length - 2], "ip": ip, "registered": true});
	mservices.push({"unique_name": unique_name, "service_name": Config.HTTPS_SERVICE, "service_type": Config.HTTPS_SERVICE, "port": ports[ports.length - 1], "ip": ip, "registered": true});

	return mservices;
	}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// PARSE / FORMAT // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.loadJSON = fibrous( function(file, bParse, bThrows)
	{
	var manifest = null;

	try {
		var manifest = fs.sync.readFile(file, {encoding: "utf8"});
		if(bParse)
			manifest = self.parseJSON(manifest, bThrows);
		}
	catch(err)
		{
		manifest = null;
		if(bThrows)
			throw self.error(Language.E_LOAD_JSON.p("Utility::loadJSON"), err);
		}

	return manifest;
	});

self.parseJSON = function(str, throws)
	{
	var json;

	try {
		json = JSON.parse(str);
		}
	catch(err)
		{
		if(throws)
			throw self.error(Language.E_JSON_PARSE_FAILED.p("Utility::parseJSON"), err);
		}

	return json;
	}

self.replaces = function(str, strs)
	{ // Replace all occurances of %0, %1, ..., %strs.length - 1 with strings in the strs array. Reverse order so that e.g. %11 gets replaced before %1.
	for(var s=strs.length - 1; s>=0; s--)
		{
		var regx = new RegExp("%" + s, "g");
		str = str.replace(regx, (typeof strs[s] == "undefined" ? "?" : strs[s]));
		}

	return str;
	}

self.replace = function(str, strs)
	{ // Replace all occurances of named parameters supplied in the strs object in the str.
	for(i in strs)
		str = str.replace(i, strs[i]);
	return str;
	}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// OPERATING SYSTEM  // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.execute = function(command, args, options, spmMessage, callback)
	{
	var bExited = false;
	var stdout = "";
	var stderr = "";

	var spawned = spawn(command, args, options);

	spawned.stdout.on("data", function(data)
		{
		if(spmMessage)
			spmMessage.sync(data, true);
		else
			require("./logger").force(data, true);

		stdout += data;
		});

	spawned.stderr.on("data", function(data)
		{
		if(spmMessage)
			spmMessage.sync(data, true);
		else
			require("./logger").force(data, true);

		stderr += data;
		});

	spawned.on("error", function(err)
		{
		if(!bExited) {
			callback(err, null); bExited = true; }
		});

	spawned.on("close", function(code)
		{
		if(!bExited) {
			callback(null, {code: code, signal: null, stdout: stdout, stderr: stderr}); bExited = true; }
		});

	spawned.on("exit", function(code, signal)
		{
		if(!bExited) {
			callback(null, {code: code, signal: signal, stdout: stdout, stderr: stderr}); bExited = true; }
		});
	}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// STRING   // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.ucfirst = function(str)
	{
	return str.charAt(0).toUpperCase() + str.slice(1);
	}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// DATE  // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.getLocalDateTime = function()
	{
	var date;
	date = new Date();
	date = date.getFullYear() + "-" +
	("00" + (date.getMonth()+1)).slice(-2) + "-" +
	("00" + date.getDate()).slice(-2) + " " +
	("00" + date.getHours()).slice(-2) + ":" +
	("00" + date.getMinutes()).slice(-2) + ":" +
	("00" + date.getSeconds()).slice(-2);

	return date;
	}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// TYPES // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.isObjectEmpty = function(obj)
	{
	return (typeof obj != "object" ? true : (Object.keys(obj).length == 0 ? true : false));
	}

self.assoc = function(_array, _key, _value)
	{ // Imitate associative arrays
//console.log(_key in _array, _key, _value)
console.log(_key in _array);
	_key in _array ? _array[_key] = [_value] : _array[key].push(_value);

	return _array;
	}

}

module.exports = new utility();
