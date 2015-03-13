#!/usr/bin/env node
/**
 * WebServer, 29.11.2013 Spaceify Inc.
 * 
 * @class WebServer
 */

var fs = require("fs");
var url = require("url");
var kiwi = require("kiwi");
var http = require("http");
var https = require("https");
var qs = require("querystring");
var fibrous = require("fibrous");
var logger = require("./logger");
var reload = require("./reload");
var Config = require("./config")();
var Utility = require("./utility");
var Language = require("./language");
var contentTypes = require("./contenttypes");

function WebServer()
{
var self = this;

var options = {};
var webServer = null;

self.connect = function(opts, callback)
	{
	options.hostname = opts.hostname || "";
	options.port = opts.port || 80;
	options.is_secure = opts.is_secure || false;
	options.key = opts.key || Config.SPACEIFY_TLS_PATH + Config.SERVER_KEY;
	options.crt = opts.crt || Config.SPACEIFY_TLS_PATH + Config.SERVER_CRT;
	options.ca_crt = opts.ca_crt || Config.SPACEIFY_WWW_PATH + Config.SPACEIFY_CRT;
	options.core = opts.core || null;

	options.index_file = opts.index_file || Config.INDEX_FILE;
	options.www_path = opts.www_path || Config.SPACEIFY_WWW_PATH;
	options.kiwi_used = opts.kiwi_used || false;

	options.templates = opts.templates || Config.TEMPLATES_PATH;
	options.languages = opts.languages || Config.LANGUAGES_PATH;

	options.owner = opts.owner || "-";
	options.protocol = (!options.is_secure ? "http" : "https");
	options.server_name = opts.server_name || Config.SERVER_NAME;

	options.engineiojs = opts.spaceifyclientjs = "";
	if(opts.spaceifyClient)
		{
		options.engineiojs = fs.readFileSync(options.www_path + Config.ENGINEIOJS, {"encoding": "utf8"});
		options.spaceifyclientjs = fs.readFileSync(options.www_path + "/" + Config.SPACEIFYCLIENTJS, {"encoding": "utf8"});
		}

	// -- --

	logger.info(Utility.replace(Language.WEBSERVER_CONNECTING, {":owner": options.owner, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port}));

	// -- --
	if(!options.is_secure)												// Start a http server
		{
		webServer = http.createServer( function(request, response)
			{
			var body = "";
			request.on("data", function(chunk) { body += chunk; });
			request.on("end", function() { getWebPage(request, response, body); });
			});
		}
	else																// Start a https server
		{
		var key = fs.sync.readFile(options.key);
		var crt = fs.sync.readFile(options.crt);
		var ca_crt = fs.sync.readFile(options.ca_crt);

		webServer = https.createServer({ key: key, cert: crt, ca: ca_crt }, function(request, response)
			{
			var body = "";
			request.on("data", function(chunk) { body += chunk; });
			request.on("end", function() { getWebPage(request, response, body); });
			});
		}

	webServer.listen(options.port, options.hostname, 511, function()
		{
		callback(null, true);
		});

	webServer.on("error", function(err)
		{
		callback(Utility.ferror(Language.E_WEBSERVER_FAILED_START.p("WebServer()::connect"), {hostname: options.hostname, port: options.port, err: err.toString()}), null);
		});
	};

self.close = fibrous( function()
	{
	if(webServer != null)
		{
		logger.info(Utility.replace(Language.WEBSERVER_CLOSING, {":owner": options.owner, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port}));
		
		webServer.close();
		webServer = null;
		}
	});

// // // // // // // // // // // // // // // // // // // // // // // // //
var getWebPage = function(request, response, body)
	{
	var content = "", location = "";

	var purl = url.parse(request.url, true);

	addSlash = (purl.pathname.search(/\/$/) != -1 ? "" : "/");												// already ends with a forward slash?

	if(purl.pathname != "/")																				// remove forward slash from the beginning
		purl.pathname = purl.pathname.replace(/^\//, "");
	
	// Try to load a page - from templates or from www
	fibrous.run(function()
		{
		var ok = false;

		try {
			if(options.core && options.core.find && purl.query.service)										// redirection request to applications internal web server
				{
				var _find = options.core.find("service", {unique_name: purl.query.service, service_name: (!options.is_secure ? Config.HTTP_SERVICE : Config.HTTPS_SERVICE)});
				if(_find != null)
					{
					var getobj = purl.query, gets = "";														// Preserve get
					delete getobj.service
					for(i in getobj)
						gets += (gets == "" ? "?" : "&") + i + "=" + getobj[i];

					location = options.protocol + "://" + request.headers["host"] + ":" + _find.obj.port + "/" + gets;
					content = Utility.replace(Language.E_MOVED_FOUND.message, {":location": location, ":server_name": options.server_name, ":hostname": options.hostname, ":port": options.port});
					ok = write(content, "html", response, 302, location);
					}
				}

			if(purl.query.app && purl.query.type)															// load files from <type>/<unique_name>/volume/application/www directory
				{
				var type_path = "";
				var base_path = Utility.makeUniqueDirectory(purl.query.app) + Config.VOLUME_DIRECTORY + Config.APPLICATION_DIRECTORY + Config.WWW_DIRECTORY;

				if(purl.query.type == Config.SPACELET)
					type_path = Config.SPACELETS_PATH;
				else if(purl.query.type == Config.SANDBOXED_APPLICATION)
					type_path = Config.SANDBOXED_PATH;
				else if(purl.query.type == Config.NATIVE_APPLICATION)
					type_path = Config.NATIVE_PATH;
				else if(purl.query.type == Config.ANY)
					{
					try {
						type_path = Config.SPACELETS_PATH;
						if(Utility.sync.isLocal(type_path + base_path + purl.pathname, "file"))
							throw true;

						type_path = Config.SANDBOXED_PATH;
						if(Utility.sync.isLocal(type_path + base_path + purl.pathname, "file"))
							throw true;

						type_path = Config.NATIVE_PATH;
						if(Utility.sync.isLocal(type_path + base_path + purl.pathname, "file"))
							throw true;
						}
					catch(err) 
						{}
					}

				ok = load.sync(type_path + base_path, purl.pathname, request, response, body);
				}

			if(!ok)																							// kiwi templates
				ok = kiwiRender.sync(purl.pathname, purl.query, request, response, body);

			if(!ok)																							// kiwi templates + index file
				ok = kiwiRender.sync(purl.pathname + addSlash + options.index_file, purl.query, request, response, body);

			if(addSlash == "/" && Utility.sync.isLocal(options.www_path + purl.pathname, "directory"))		// redirect browser permanently to pathname + /
				{
				location = options.protocol + "://" + request.headers["host"] + "/" + purl.pathname + "/";
				content = Utility.replace(Language.E_MOVED_PERMANENTLY.message, {":location": location, ":server_name": options.server_name, ":hostname": options.hostname, ":port": options.port});
				ok = write(content, "html", response, 301, location);
				}

			if(!ok)																							// www
				ok = load.sync(options.www_path, purl.pathname, request, response, body);

			if(!ok)																							// www + index file
				ok = load.sync(options.www_path, purl.pathname + addSlash + options.index_file, request, response, body);

			if(!ok)																							// kiwi templates + 404
				ok = kiwiRender.sync("404", purl.query, request, response, body, 404);

			if(!ok)
				throw 500;
			}
		catch(err)
			{
			if(err == 500)
				content = Utility.replace(Language.E_INTERNAL_SERVER_ERROR.message, {":server_name": options.server_name, ":hostname": options.hostname, ":port": options.port});
			write(content, "html", response, err, location);
			}
		}, function(err) { } );
	}

var kiwiRender = fibrous(function(pathname, query, request, response, body, responseCode)
	{
	try {
		if(!options.kiwi_used)
			throw false;

		pathname = checkURL("", pathname);

		// Get base name from the url - remove the content type
		var basename = pathname.replace(/\.[^.]*$/, "");
		basename = basename.replace(/^\//, "");
		basename = basename.toLowerCase();

		// Parse POST from body to object
		var post = parsePost(request, body);

		// Get a language file for the template - default is en_US
		var language = "en_US"; // ToDo: get from sqlite3!!!
		if(query && query.lang)
			language = query.lang;
		else if(post.lang)
			language = post.lang;

		var layout_file = "layout.tpl";
		var template_file = basename + ".html";
		var view_file = basename + "_v.js";
		var language_file = language + ".js";
		var configuration_file =  "configuration.js";

		// Get the actual layout, template, view and language files
		if(	!Utility.sync.isLocal(options.templates + template_file, "file") ||
			!Utility.sync.isLocal(options.templates + view_file, "file") ||
			!Utility.sync.isLocal(options.languages + language_file, "file"))
			throw false;

		var layout = fs.sync.readFile(options.templates + layout_file, {"encoding": "utf8"});
		var template = fs.sync.readFile(options.templates + template_file, {"encoding": "utf8"});
		var view = reload.require(options.templates + view_file);
		var language = reload.require(options.languages + language_file);
		var configuration = reload.require(options.templates + configuration_file);

		// Apply data and render
		var parent = new kiwi.Template(layout);
		var kiwit = new kiwi.Template(template);
		var ip = request.connection.remoteAddress;
		language = language.make(basename);
		configuration = configuration.make();

		var data = view.getData(ip, request.url, query, post, language, basename, configuration);
		data.parent = parent;
		data.engineiojs = options.engineiojs;
		data.spaceifyclientjs = options.spaceifyclientjs;
		data.protocol = options.protocol;
		data.section = basename;
		data.get = query;
		data.post = post;

		var rendered = kiwit.sync.render(data);

		write(rendered.toString(), "html", response, responseCode);

		return true;
		}
	catch(err)
		{
//console.log("RENDER ERROR:", err.toString());
		return false;
		}
	});

var load = fibrous(function(www_path, pathname, request, response, body, responseCode)
	{
	try {
		www_file = checkURL(www_path, pathname);

		if(!Utility.sync.isLocal(www_file, "file"))									// Test is the file in the www folder
			throw false;

		var file = fs.sync.readFile(www_path + pathname);

		var i = pathname.lastIndexOf(".");
		var contentType = pathname.substr(i + 1, pathname.length - i - 1);

		write(file, contentType, response, responseCode);

		return true;
		}
	catch(err)
		{
		return false;
		}
	});

var write = function(content, contentType, response, responseCode, location)
	{
	var headers = {};
	var now = new Date();
	headers["Content-Type"] = (contentTypes[contentType] ? contentTypes[contentType] : "text/plain"/*application/octet-stream*/) + "; charset=utf-8";
	headers["Accept-Ranges"] = "bytes";
	headers["Content-Length"] = content.length;
	headers["Server"] = options.server_name;
	headers["Date"] = now.toUTCString();
	headers["Access-Control-Allow-Origin"] = "*";
	if(responseCode == 301 || responseCode == 302)
		headers["Location"] = location;

	response.writeHead(responseCode || 200, headers);
	response.end(content);

	return true;
	}

var parsePost = function(request, body)
	{
	return (request.method.toLowerCase() == "post" && request.headers["content-type"].toLowerCase() == "application/x-www-form-urlencoded" ? qs.parse(body) : {});
	}

var checkURL = function(www_path, pathname)
	{
	// The pathname must be checked so that loading is possible only from supplied www_path	
	pathname = pathname.replace(/\.\./g, "");							// prevent ../ attacks, e.g. displaying /../../../../../../../../../../../../../../../etc/shadow
	pathname = pathname.replace(/\/{2,}/g, "");

	pathname = pathname.replace(/(\[.*?\])|(\{.*?\})/g, "");			// ranges

	pathname = pathname.replace(/[~*^|?$\[\]{}\\]/g, "");				// characters

	www_path = www_path + pathname;										// Can not have something//something
	www_path = www_path.replace(/\/{2,}/g, "/");

	return www_path;
	}
}

module.exports = WebServer;
