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
var mrequest = require("request");
var logger = require("./logger");
var reload = require("./reload");
var Const = require("./constants");
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
	options.isSsl = opts.isSsl || false;
	options.sslKey = opts.sslKey || "";
	options.sslCert = opts.sslCert || "";
	options.core = opts.core || null;

	options.www_path = opts.www_path || Config.WWW_PATH;
	options.local_template_path = opts.local_template_path || Config.LOCAL_TEMPLATE_PATH;
	options.local_language_path = opts.local_language_path || Config.LOCAL_LANGUAGE_PATH;
	options.server_name = opts.server_name || Const.SERVER_NAME;

	options.owner = opts.owner || "-";
	options.protocol = (!options.isSsl ? "http" : "https");

	options.engineiojs = options.spaceifyclientjs = "";	
	options.spaceifyClient = opts.spaceifyClient || false;
	if(opts.spaceifyClient)
		{
		options.engineiojs = fs.readFileSync(options.www_path + Const.ENGINEIOJS, {"encoding": "utf8"});
		options.spaceifyclientjs = fs.readFileSync(options.www_path + Const.SPACEIFYCLIENTJS, {"encoding": "utf8"});
		}

	// -- --

	logger.info(Utility.replace(Language.WEBSERVER_CONNECTING, {":owner": options.owner, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port}));

	// -- --

	if(!options.isSsl)													// Start a http server
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
		var sslCaCert = fs.readFileSync(Config.CA_CERT_PATH);
		webServer = https.createServer({ key: options.sslKey, cert: options.sslCert, ca: [sslCaCert]/*, rejectUnauthorized: false, agent: false, requestCert: true*/}, function(request, response)
			{
			var body = "";
			request.on("data", function(chunk) { body += chunk; });
			request.on("end", function()
				{
				/*var dw = Date.now();
				console.log(dw);*/
				getWebPage(request, response, body);
				/*var dw2 = Date.now();
				console.log(dw2);
				console.log(parseInt(dw2) - parseInt(dw));*/
				});
			});
		}

	webServer.listen(options.port, options.hostname, 511, function()
		{
		callback(null, true);
		});

	webServer.on("error", function(err)
		{
		callback(Utility.ferror(false, Language.E_WEBSERVER_FAILED_START.p("WebServer()::connect"), {hostname: options.hostname, port: options.port, err: err.toString()}), null);
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
			if(options.core && purl.query.service && options.core.getServiceMappingsByUniqueName)			// redirection request to applications internal web server
				{
				var service = options.core.getServiceMappingsByUniqueName(purl.query.service, (!options.isSsl ? Const.CLIENT_HTTP_SERVER : Const.CLIENT_HTTPS_SERVER));
				if(service != null)
					{
					location = options.protocol + "://" + request.headers["host"] + ":" + service.port + "/";
					content = Utility.replace(Language.E_MOVED_FOUND.message, {":location": location, ":server_name": options.server_name, ":hostname": options.hostname, ":port": options.port});
					ok = write(content, "html", response, 302, location);
					}
				}

			if(purl.query.app && purl.query.type)															// load files from spacelets/<unique_name>/volume/application/www directory
				{
				var app_path = "";
				if(purl.query.type == Const.SPACELET)
					app_path = Config.SPACELETS_PATH;
				else if(purl.query.type == Const.SANDBOXED_APPLICATION)
					app_path = Config.SANDBOXEDAPPS_PATH;
				else if(purl.query.type == Const.NATIVE_APPLICATION)
					app_path = Config.NATIVEAPPS_PATH;
				var www_path = app_path + Utility.makeUniqueDirectory(purl.query.app) + Config.VOLUME_DIRECTORY + Config.APPLICATION_DIRECTORY + Config.WWW_DIRECTORY;

				ok = load.sync(www_path, purl.pathname, request, response, body);
				}

			if(!ok)																							// templates
				ok = render.sync(purl.pathname, purl.query, request, response, body);

			if(!ok)																							// templates + index.html
				ok = render.sync(purl.pathname + addSlash + "index.html", purl.query, request, response, body);

			if(addSlash == "/" && Utility.sync.isLocalDirectory(options.www_path + purl.pathname))			// redirect browser permanently to pathname + /
				{
				location = options.protocol + "://" + request.headers["host"] + "/" + purl.pathname + "/";
				content = Utility.replace(Language.E_MOVED_PERMANENTLY.message, {":location": location, ":server_name": options.server_name, ":hostname": options.hostname, ":port": options.port});
				ok = write(content, "html", response, 301, location);
				}

			if(!ok)																							// www
				ok = load.sync(options.www_path, purl.pathname, request, response, body);

			if(!ok)																							// www + index.html
				ok = load.sync(options.www_path, purl.pathname + addSlash + "index.html", request, response, body);

			if(!ok)																							// templates + 404
				ok = render.sync("404", purl.query, request, response, body, 404);

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

var render = fibrous(function(pathname, query, request, response, body, responseCode)
	{
	try {
		pathname = escape(pathname);													// The pathname must be checked so that loading is possible only from supplied www_path

		// Get base name from the url
		var basename = pathname.replace(/(\.html)|(\.htm)/i, "");
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
		if(	!Utility.sync.isLocalFile(options.local_template_path + template_file) ||
			!Utility.sync.isLocalFile(options.local_template_path + view_file) ||
			!Utility.sync.isLocalFile(options.local_language_path + language_file))
			throw false;

		var layout = fs.sync.readFile(options.local_template_path + layout_file, {"encoding": "utf8"});
		var template = fs.sync.readFile(options.local_template_path + template_file, {"encoding": "utf8"});
		var view = reload.require(options.local_template_path + view_file);
		var language = reload.require(options.local_language_path + language_file);
		var configuration = reload.require(options.local_template_path + configuration_file);

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
//console.log(err.toString());
		return false;
		}
	});

var load = fibrous(function(www_path, pathname, request, response, body, responseCode)
	{
	try {
		pathname = escape(pathname);													// The pathname must be checked so that loading is possible only from supplied www_path

		if(!Utility.sync.isLocalFile(www_path + pathname))								// Test is the file in the www folder
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

var escape = function(pathname)
	{
	pathname = pathname.replace(/\.\./g, "");							// prevent ../ attacks, e.g. displaying /../../../../../../../../../../../../../../../etc/shadow
	pathname = pathname.replace(/\/{2,}/g, "");

	pathname = pathname.replace(/(\[.*?\])|(\{.*?\})/g, "");			// ranges

	pathname = pathname.replace(/[~*^|?$\[\]{}\\]/g, "");				// characters

	return pathname;
	}
}

module.exports = WebServer;
