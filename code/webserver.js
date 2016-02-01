#!/usr/bin/env node
/**
 * Web Server, 29.11.2013 Spaceify Inc.
 * 
 * @class WebServer
 */

var fs = require("fs");
var url = require("url");
var crypto = require("crypto");
var kiwi = require("kiwi");
var http = require("http");
var https = require("https");
var qs = require("querystring");
var fibrous = require("fibrous");
var logger = require("./logger");
var reload = require("./reload");
var config = require("./config")();
var utility = require("./utility");
var language = require("./language");
var contentTypes = require("./contenttypes");

function WebServer()
{
var self = this;

var options = {};
var webServer = null;

var serverUpListener = null;
var serverDownListener = null;
var externalRequestListener = null;

var sessions = {};
var SESSIONTOKEN = "sessiontoken";

self.connect = function(opts, callback)
	{
	options.hostname = opts.hostname || "";
	options.port = opts.port || 80;

	options.is_secure = opts.is_secure || false;
	options.key = opts.key || config.SPACEIFY_TLS_PATH + config.SERVER_KEY;
	options.crt = opts.crt || config.SPACEIFY_TLS_PATH + config.SERVER_CRT;
	options.ca_crt = opts.ca_crt || config.SPACEIFY_WWW_PATH + config.SPACEIFY_CRT;

	options.index_file = opts.index_file || config.INDEX_FILE;
	options.www_path = opts.www_path || config.SPACEIFY_WWW_PATH;
	options.kiwi_used = opts.kiwi_used || false;

	options.locale = options.locale || config.DEFAULT_LOCALE;
	options.template_path = opts.template_path || config.TEMPLATES_PATH;
	options.language_path = opts.language_path || config.LANGUAGES_PATH;

	options.owner = opts.owner || "-";
	options.server_name = opts.server_name || config.SERVER_NAME;

	options.protocol = (!options.is_secure ? "http" : "https");

	options.carbage_collect_interval = (opts.carbage_collect_interval || 600) * 1000;	// Execute carbage collection every ten minutes
	options.session_delete_interval = (opts.session_delete_interval || 3600) * 1000;	// Session expires after one hour of inactivity

	// -- --

	options.carbage_interval_id = setInterval(carbageCollection, options.carbage_collect_interval);

	// -- --

	logger.info(utility.replace(language.WEBSERVER_CONNECTING, {":owner": options.owner, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port}));

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
		if(serverUpListener)
			serverUpListener({is_secure: options.is_secure});

		callback(null, true);
		});

	webServer.on("error", function(err)
		{
		if(serverDownListener)
			serverDownListener({is_secure: options.is_secure});

		callback(utility.ferror(language.E_WEBSERVER_FATAL_ERROR.p("WebServer()::connect"), {":hostname": options.hostname, ":port": options.port, ":err": err.toString()}), null);
		});

	webServer.on("close", function()
		{
		if(serverDownListener)
			serverDownListener({is_secure: options.is_secure});
		});
	};

self.close = function()
	{
	if(webServer != null)
		{
		logger.info(utility.replace(language.WEBSERVER_CLOSING, {":owner": options.owner, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port}));
		
		webServer.close();
		webServer = null;
		}
	}

self.setServerUpListener = function(listener)
	{
	serverUpListener = (typeof listener == "function" ? listener : null);
	}

self.setServerDownListener = function(listener)
	{
	serverDownListener = (typeof listener == "function" ? listener : null);
	}

self.setExternalRequestListener = function(listener)
	{
	externalRequestListener = (typeof listener == "function" ? listener : null);
	}

// // // // // // // // // // // // // // // // // // // // // // // // //
var getWebPage = function(request, response, body)
	{
	var content = "", location = "";

	var purl = url.parse(request.url, true);

	addSlash = (purl.pathname.search(/\/$/) != -1 ? "" : "/");												// already ends with a forward slash?

	if(purl.pathname != "/")																				// remove forward slash from the beginning
		purl.pathname = purl.pathname.replace(/^\//, "");
	
	// Try to load a page - from templates or from www
	fibrous.run( function()
		{
		var ok = false;

		try {
			if(externalRequestListener)
			{
				var rs = externalRequestListener.sync(request, body, options.is_secure, options.protocol);

				if(rs.type == "kiwi")
					ok = kiwiRender.sync(rs.pathname, rs.query, request, response, body, rs.responseCode);
				else if(rs.type == "load")
					ok = load.sync(rs.www_path, rs.pathname, request, response, body, rs.responseCode);
				else if(rs.type == "write")
					ok = write.sync(rs.content, rs.contentType, request, response, rs.responseCode, rs.location, []);
			}

			if(!ok)																							// kiwi templates
				ok = kiwiRender.sync(purl.pathname, purl.query, request, response, body);

			if(!ok)																							// kiwi templates + index file
				ok = kiwiRender.sync(purl.pathname + addSlash + options.index_file, purl.query, request, response, body);

			if(addSlash == "/" && utility.sync.isLocal(options.www_path + purl.pathname, "directory"))		// redirect browser permanently to pathname + /
				{
				location = options.protocol + "://" + request.headers["host"] + "/" + purl.pathname + "/";
				content = utility.replace(language.E_MOVED_PERMANENTLY.message, {":location": location, ":server_name": options.server_name, ":hostname": options.hostname, ":port": options.port});
				ok = write(content, "html", request, response, 301, location, []);
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
				content = utility.replace(language.E_INTERNAL_SERVER_ERROR.message, {":server_name": options.server_name, ":hostname": options.hostname, ":port": options.port});
			write(content, "html", request, response, err, location, []);
			}
		}, function(err, data) { } );
	}

var kiwiRender = fibrous(function(pathname, query, request, response, body, responseCode)
	{
	try {
		if(!options.kiwi_used)
			throw false;

		// Get base name from the url - remove the content type
		pathname = checkURL("", pathname);

		var basename = pathname.replace(/\.[^.]*$/, "");
		basename = basename.replace(/^\//, "");
		basename = basename.toLowerCase();

		// Parse POST parameters as object
		var post = parsePost(request, body);

		// Get a language file for the template - default is language defined in the options.locale
		var locale = options.locale;

		if(query && query.loc)
			locale = query.loc;
		else if(post.loc)
			locale = post.loc;

		// Get the actual layout, template, view and language files
		var layout_file = options.template_path + "layout.tpl";
		var template_file = options.template_path + basename + ".html";
		var view_file = options.template_path + basename + ".js";
		var language_file = options.language_path + locale + ".json";

		if(	!utility.sync.isLocal(template_file, "file") ||
			!utility.sync.isLocal(view_file, "file") ||
			!utility.sync.isLocal(language_file, "file"))
			throw false;

		var layout = fs.sync.readFile(layout_file, {"encoding": "utf8"});
		var template = fs.sync.readFile(template_file, {"encoding": "utf8"});
		var languageo = fs.sync.readFile(language_file, {"encoding": "utf8"});

		var view = reload.require(view_file);
		var language_utility = reload.require(options.language_path + "languageutility.js");

		// KiWi templates have sessions
		var headers = setSession(request, []);

		// Apply data and render
		var parent = new kiwi.Template(layout);
		var kiwit = new kiwi.Template(template);

		var url = request.url;
		var ip = request.connection.remoteAddress;		// Proxy? -> request.headers["x-forwarded-for"]
		languageo = language_utility.make(basename, languageo);

		var user_data = null, session = null, sessiontoken = parseCookie(request, SESSIONTOKEN);
		if(sessiontoken)
			session = getSession(sessiontoken);
		if(session)
			user_data = session.user_data;
/*if(session)
{
console.log("UDB: ", user_data);
console.log("ST: ", sessiontoken);
console.log("SE: ", session);
console.log("UDA: ", session.user_data, "\n\n");
}*/
		var data = view.sync.getData(ip, url, query, post, user_data, options.is_secure, languageo);
		data.parent = parent;									// Template
		data.host_protocol = options.protocol;					// Host
		data.host_get = query;
		data.host_post = post;
		data.host_ip = ip;
		data.edge_url_current = options.protocol + "://" + config.EDGE_IP + "/";
		data.edge_url_http = "http://" + config.EDGE_IP + "/";
		data.edge_url_https = "https://" + config.EDGE_IP + "/";
		data.is_secure = options.is_secure;
		data.section = languageo.section;						//  Language
		data.locale = languageo.locale;
		data.language = languageo.language;
		data.language_smarty = languageo.language_smarty;
		if(sessiontoken && data.user_data)						// Update sessions user data
			updateSession(sessiontoken, data.user_data);

		var rendered = kiwit.sync.render(data);

		write(rendered.toString(), "html", request, response, responseCode, "", headers);

		return true;
		}
	catch(err)
		{
if(err != false) console.log("RENDER ERROR:", err.toString());
		return false;
		}
	});

var load = fibrous(function(www_path, pathname, request, response, body, responseCode)
	{
	try {
		www_file = checkURL(www_path, pathname);

		if(!utility.sync.isLocal(www_file, "file"))									// Test is the file in the www folder
			throw false;

		var file = fs.sync.readFile(www_path + pathname);

		var i = pathname.lastIndexOf(".");
		var contentType = pathname.substr(i + 1, pathname.length - i - 1);

		write(file, contentType, request, response, responseCode, "", []);

		return true;
		}
	catch(err)
		{
		return false;
		}
	});

var write = function(content, contentType, request, response, responseCode, location, headers)
	{
	var now = new Date();
	headers.push(["Content-Type", (contentTypes[contentType] ? contentTypes[contentType] : "text/plain"/*application/octet-stream*/) + "; charset=utf-8"]);
	headers.push(["Accept-Ranges", "bytes"]);
	headers.push(["Content-Length", content.length]);
	headers.push(["Server", options.server_name]);
	headers.push(["Date", now.toUTCString()]);
	headers.push(["Access-Control-Allow-Origin", "*"]);//request.headers.origin ? request.headers.origin : "*";//request.headers.host;
	//headers.push(["X-Frame-Options", "SAMEORIGIN"]);
	if(responseCode == 301 || responseCode == 302)
		headers.push(["Location", location]);

	response.writeHead(responseCode || 200, headers);
	response.end(content);

	return true;
	}

var parsePost = function(request, body)
	{ // Simple parsing of POST body
	var post = {};

	try
		{
		if(!request.headers["content-type"])
			throw "";

		var content_type = request.headers["content-type"].toLowerCase();
		if(request.method.toLowerCase() != "post")
			throw "";

		if(content_type.indexOf("application/x-www-form-urlencoded") != -1)
			post = qs.parse(body);
		else if(content_type.indexOf("application/json") != -1)
			post = JSON.parse(body);
		}
	catch(err)
		{}

	return post;
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

	// SERVER SIDE SESSIONS - IMPLEMENTED USING HTTP COOKIES -- -- -- -- -- -- -- -- -- -- //
var setSession = function(request, headers)
	{
	var session = null, sessiontoken = parseCookie(request, SESSIONTOKEN);
	if(sessiontoken)
		session = getSession(sessiontoken);

	if(!session)														// Create a session if it doesn't exist yet
		headers = createSession(headers, "/", request.connection.remoteAddress, request);
	else																// Update an existing session
		headers = refreshSession(headers, sessiontoken, request);

	return headers;
	}

var createSession = function(headers, Path, Domain, request)
	{
	shasum = crypto.createHash("sha512");
	var result = utility.bytesToHexString(crypto.randomBytes(16));
	shasum.update(result);
	var sessiontoken = shasum.digest("hex").toString();

	var session = SESSIONTOKEN + "=" + sessiontoken + "; HttpOnly";
	if(options.is_secure)
		session += "; Secure";
	if(Path)
		session += "; Path=" + Path;
	if(Domain)
		session += "; Domain=" + Domain;
	headers.push(["Set-Cookie", session]);

	sessions[sessiontoken] = { timestamp: Date.now(), user_data: {} };
//console.log("CREATE SESSION:\n", (options.is_secure ? "HTTPS " : "HTTP"), request.url, request.connection.remoteAddress, "\n", session, "\n\n");
	return headers;
	}

var refreshSession = function(headers, sessiontoken, request)
	{ // Refresh session and send sessiontoken back to the web browser
	if(sessions.hasOwnProperty(sessiontoken))
		{
		sessions[sessiontoken].timestamp = Date.now();
		headers.push([SESSIONTOKEN, sessiontoken]);
		}
//console.log("REFRESH SESSION:\n", (options.is_secure ? "HTTPS " : "HTTP"), request.url, request.connection.remoteAddress, "\n", sessiontoken, "\n\n");
	return headers;
	}

var getSession = function(sessiontoken)
	{
	return (sessions.hasOwnProperty(sessiontoken) ? sessions[sessiontoken] : null);
	}

var updateSession = function(sessiontoken, user_data)
	{ // Updates user_data and refreshes the session
	if(sessions.hasOwnProperty(sessiontoken))
		{
		sessions[sessiontoken].user_data = user_data;
		sessions[sessiontoken].timestamp = Date.now();
		}
	}

var parseCookie = function(request, search)
	{
	var namevalues, namevalue, nam, val;

	namevalues = (!search ? [] : null);									// Return an array of name-value pairs or a value

	var cookies = (request.headers.cookie || request.headers.Cookie || "").split(";");
	for(var i=0; i<cookies.length; i++)
		{
		var namevalue = cookies[i].split("=");
		if(namevalue.length == 2)
			{
			nam = namevalue[0].trim();
			val = namevalue[1].trim();

			if(!search)														// Get them all
				namevalues.push({name: nam, value: val});
			else if(search == nam) {										// Search for a specific name-value pair
				namevalues = val; break; }
			}
		}

	return namevalues;													// Empty if no cookies found / null if search fails
	}

	// CARBAGE COLLECTION -- -- -- -- -- -- -- -- -- -- //
var carbageCollection = function()
	{
	for(token in sessions)														// Remove expired sessions
		{
		if(Date.now() - sessions[token].timestamp >= options.session_delete_interval)
			delete sessions[token];
		}
	}

}

module.exports = WebServer;
