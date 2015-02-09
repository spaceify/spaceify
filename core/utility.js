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
var zipper = require("zipper").Zipper;
var spawn = require("child_process").spawn;
var Language = require("./language");
var Const = require("./constants");
var Config = require("./config")();

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
		throw self.error(Language.E_FAILED_TO_INITIATE_HTTP_GET.p("Utility::loadRemoteFile()"), err);
		}

	if(result.statusCode != 200)
		throw self.ferror(Language.E_FAILED_TO_LOAD_REMOTE_FILE.p("Utility::loadRemoteFile()"), {":file": fileUrl, ":code": result.statusCode});

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
			throw self.error(Language.E_LOADREMOTEFILETOLOCALFILE.p("Utility::loadRemoteFileToLocalFile()"), err);
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
			throw self.error(Language.E_DELETEDIRECTORY.p("Utility::deleteDirectory()"), err);
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
			throw self.error(Language.E_COPYDIRECTORY.p("Utility::copyDirectory()"), err);
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
			throw self.error(Language.E_MOVEDIRECTORY.p("Utility::moveDirectory()"), err);
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
			throw self.error(Language.E_DELETEFILE.p("Utility::deleteFile()"), err);
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
			throw self.error(Language.E_COPYFILE.p("Utility::copyFile()"), err);
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
			throw self.error(Language.E_MOVEFILE.p("Utility::moveFile()"), err);
		}
});

self.zipDirectory = fibrous( function(source, target, zipfile)			// Recursively add files to the zip archive zipfile
	{
	try {
		var stats = fs.sync.stat(source);
		if(typeof stats == "undefined" || !stats.isDirectory()) return;

		var zipa = new zipper(zipfile);

		fs.sync.readdir(source).forEach(function(file, index)
			{
			var sourcePath = source + file;
			var targetPath = target + (target != "" ? "/" : "") + file;
			if(fs.sync.stat(sourcePath).isDirectory())
				self.sync.zipDirectory(sourcePath + "/", targetPath, zipfile);
			else
				zipa.sync.addFile(sourcePath, targetPath);
			});
		}
	catch(err)
		{
		throw self.error(Language.E_ZIPDIRECTORY.p("Utility::zipDirectory()"), err);
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

	return null;
	}

self.writeFile = fibrous( function(targetDir, targetFile, data)
	{
	mkdirp.sync(targetDir);

	fs.sync.writeFile(targetDir + targetFile, data);
	});

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
		throw self.error(Language.E_FAILED_TO_INITIATE_HTTP_POST.p("Utility::postForm()"), err);
		}

	if(result.statusCode != 200)
		throw self.ferror(Language.E_FAILED_TO_POST_FORM.p("Utility::postForm()"), {":url": url, ":code": result.statusCode});

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
				"Content-Disposition" : 'form-data; name="package"; filename="' + Const.PUBLISHZIP + '"',
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
	var paths = [];
	var codes = [];
	var messages = [];
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

	var message = pmessage = "";
	for(var i=0; i<messages.length; i++)																// Make a simple error string of the error arrays
		{
		var code = (codes[i] ? "(" + codes[i] + ") " : "");
		var path = (paths[i] ? "(" + paths[i] + ") " : "");

		message += (message != "" ? ", " : "") + code + messages[i];
		pmessage += (pmessage != "" ? ", a" : "") + (code != "" ? ", " : "") + paths + messages[i];
		}

	//self.printErrors({message: pmessage});																// Output errors

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

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// MANIFEST // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.loadManifest = fibrous( function(file, bParse, bThrows)
	{
	var manifest = null;

	try {
		var manifest = fs.sync.readFile(file, {encoding: "utf8"});
		if(bParse)
			manifest = self.parseManifest(manifest);
		}
	catch(err)
		{
		manifest = null;
		if(bThrows)
			throw self.error(Language.E_LOADMANIFEST.p("Utility::loadManifest()"), err);
		}

	return manifest;
	});

self.parseManifest = function(manifest, type)
	{
	manifest = self.parseJSON(manifest, true);

	// *** REQUIRED FIELDS
	if(typeof manifest.provides_services == "undefined" && typeof manifest.requires_services == "undefined")
		throw self.error(Language.E_MANIFEST_FIELD_SERVICES.p("Utility::parseManifest"));

	if(typeof manifest.type == "undefined")
		throw self.error(Language.E_MANIFEST_FIELD_TYPE.p("Utility::parseManifest"));

	if(typeof manifest.name == "undefined")
		throw self.error(Language.E_MANIFEST_FIELD_NAME.p("Utility::parseManifest"));

	if(typeof manifest.unique_name == "undefined")
		throw self.error(Language.E_MANIFEST_FIELD_UNIQUE_NAME.p("Utility::parseManifest"));

	if(typeof manifest.version == "undefined")
		throw self.error(Language.E_MANIFEST_FIELD_VERSION.p("Utility::parseManifest"));

	if(typeof manifest.category == "undefined")
		throw self.error(Language.E_MANIFEST_FIELD_CATEGORY.p("Utility::parseManifest"));

	if(typeof manifest.start_command == "undefined")
		throw self.error(Language.E_MANIFEST_FIELD_START_COMMAND.p("Utility::parseManifest"));

	if(manifest.type == Const.SPACELET)
		{
		if(	typeof manifest.shared == "undefined")
			throw self.error(Language.E_MANIFEST_FIELD_SHARED.p("Utility::parseManifest"));
		if(typeof manifest.inject_identifier == "undefined")
			throw self.error(Language.E_MANIFEST_FIELD_INJECT_IDENTIFIER.p("Utility::parseManifest"));
		if(typeof manifest.inject_hostnames == "undefined")
			throw self.error(Language.E_MANIFEST_FIELD_INJECT_HOSTNAMES.p("Utility::parseManifest"));
		if(typeof manifest.inject_files == "undefined")
			throw self.error(Language.E_MANIFEST_FIELD_INJECT_FILES.p("Utility::parseManifest"));
		}
	else if(manifest.type == Const.SANDBOXED_APPLICATION)
		{
		/*if(	typeof manifest.? == "undefined" )
			throw self.error(Language.E_REQUIRED_, "");*/
		}
	else if(manifest.type == Const.NATIVE_APPLICATION)
		{
		/*if(	typeof manifest.? == "undefined" )
			throw self.error(Language.E_REQUIRED_, "");*/
		}

	// *** FIELDS PROPERLY FORMATTED
	if(typeof manifest.provides_services != "undefined" && !checkServiceArray(manifest.provides_services, false))
		throw self.error(Language.E_PROVIDED_FIELDS_UNDEFINED.p("Utility::parseManifest"));

	if(typeof manifest.requires_services != "undefined" && !checkServiceArray(manifest.requires_services, true))
		throw self.error(Language.E_REQUIRED_FIELDS_UNDEFINED.p("Utility::parseManifest"));

	if(typeof manifest.inject_files != "undefined" && !checkInjectFilesArray(manifest.inject_files))
		throw self.error(Language.E_REQUIRED_INJECT_UNDEFINED.p("Utility::parseManifest"));

	// Add fields required internally by Spaceify Core
	manifest.unique_directory = self.makeUniqueDirectory(manifest.unique_name);

	return manifest;
	}

var checkServiceArray = function(service_array, isRequires)
	{
	if(!isRequires && service_array.length == 0)										// requires_services can be empty but provides_sercices can't be
		return false;

	for(s in service_array)
		{
		if(typeof service_array[s].service_name == "undefined" || typeof service_array[s].service_type == "undefined" || (isRequires && typeof service_array[s].suggested_application == "undefined"))
			return false;

		var name = service_array[s].service_name;
		var type = service_array[s].service_type.toLowerCase();
		if(name == "" || Const.SERVICE_TYPES.indexOf(type) == -1)
			return false;
		}

	return true;
	}

var checkInjectFilesArray = function(iarr)
	{
	if(iarr.length == 0)
		return false;

	for(s in iarr)
		{
		if(typeof iarr[s].directory == "undefined" || typeof iarr[s].name == "undefined" || typeof iarr[s].type == "undefined")
			return false;

		var name = iarr[s].name;
		var type = iarr[s].type.toLowerCase();
		if(name == "" || Const.INJECT_TYPES.indexOf(type) == -1)
			return false;
		}

	return true;
	}

self.makeCertName = function(unique_name)
	{
	unique_name = unique_name.toLowerCase();													// make a file system safe name
	unique_name = unique_name.replace(/[^a-z0-9]/g, "");

	if(unique_name.length > 128)																// return last 128 characters if too long
		unique_name = unique_name.slice(-128);

	return unique_name;
	}

self.makeUniqueDirectory = function(unique_name)
	{ // make a file system safe directory name: lowercase, allowed characters, can't start or end with /
	unique_name = unique_name.toLowerCase();
	unique_name = unique_name.replace(/[^a-z0-9\/]/g, "/");
	unique_name = unique_name.replace(/^\/+/, "");
	unique_name += (unique_name.search(/\/$/) != -1 ? "" : "/");

	return unique_name;
	}

self.splitPackageName = function(package)
	{
	return package.split(Const.PACKAGE_DELIMITER);
	}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// SERVICE  // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.makeServiceMappings = function(unique_name, services, ports, ip)
	{
	var serviceMappings = [];
	for(ps in services)
		serviceMappings.push({"unique_name": unique_name, "service_name": services[ps].service_name, "service_type": services[ps].service_type, "port": ports[ps], "ip": ip, "registered": false});

	serviceMappings.push({"unique_name": unique_name, "service_name": Const.CLIENT_HTTP_SERVER, "service_type": Const.SERVICE_TYPE_HTTP, "port": ports[ports.length - 2], "ip": ip, "registered": true});
	serviceMappings.push({"unique_name": unique_name, "service_name": Const.CLIENT_HTTPS_SERVER, "service_type": Const.SERVICE_TYPE_HTTPS, "port": ports[ports.length - 1], "ip": ip, "registered": true});

	return serviceMappings;
	}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// PARSE / FORMAT // // // // // // // // // // // // // // // // // // // // // // // // // // // //
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
self.isArray = function(o)
	{
	return Object.prototype.toString.call(o) === "[object Array]";
	}

self.isObjectEmpty = function(obj)
	{
	return (typeof obj != "object" ? true : (Object.keys(obj).length == 0 ? true : false));
	}

}

module.exports = new utility();
