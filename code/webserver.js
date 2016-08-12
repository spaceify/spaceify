"use strict";

/**
 * Web Server, 29.11.2013 Spaceify Oy
 * 
 * @class WebServer
 */

var fs = require("fs");
var url = require("url");
var http = require("http");
var https = require("https");
var crypto = require("crypto");
var qs = require("querystring");
var fibrous = require("fibrous");
var Logger = require("./logger");
var language = require("./language");
var contentTypes = require("./contenttypes");
var WebOperation = require("./weboperation");
var SpaceifyError = require("./spaceifyerror");
var SpaceifyConfig = require("./spaceifyconfig");
var SpaceifyUtility = require("./spaceifyutility");

function WebServer()
{
var self = this;

var logger = new Logger();
var errorc = new SpaceifyError();
var config = new SpaceifyConfig();
var utility = new SpaceifyUtility();
var webOperation = new WebOperation();

var options = {};
var isOpen = false;
var webServer = null;

var requestListener = null;
var serverUpListener = null;
var serverDownListener = null;

var sessions = {};
var SESSIONTOKEN = "";

var locales = [];

var isSpaceify = (typeof process.env.IS_REAL_SPACEIFY == "undefined" ? true : false);

var regxHTML = /<html.*>/i;
var regxAngularJSHead = /<head.*>/i;

var requests = [];
var processingRequest = false;
var events = require('events');
var eventEmitter = new events.EventEmitter();

var CARBAGE_INTERVAL = 600000;
var SESSION_INTERVAL = 3600 * 24;

self.listen = function(opts, callback)
	{
	var key;
	var crt;
	var caCrt;
	var files;
	var body = "";

	options.hostname = opts.hostname || config.ALL_IPV4_LOCAL;
	options.port = opts.port || 80;

	options.isSecure = opts.isSecure || false;
	options.key = opts.key || config.SPACEIFY_TLS_PATH + config.SERVER_KEY;
	options.crt = opts.crt || config.SPACEIFY_TLS_PATH + config.SERVER_CRT;
	options.caCrt = opts.caCrt || config.SPACEIFY_WWW_PATH + config.SPACEIFY_CRT;

	options.indexFile = opts.indexFile || config.INDEX_HTML;

	options.wwwPath = opts.wwwPath || config.SPACEIFY_WWW_PATH;
	options.wwwErrorsPath = opts.wwwErrorsPath || config.SPACEIFY_WWW_ERRORS_PATH;

	options.locale = options.locale || config.DEFAULT_LOCALE;

	options.localesPath = opts.localesPath || config.LOCALES_PATH;

	options.serverName = opts.serverName || config.SERVER_NAME;

	options.protocol = (!options.isSecure ? "http" : "https");

	options.AdminIndexURL = opts.AdminIndexURL || config.ADMIN_INDEX_URL;
	options.AdminlogInURL = opts.AdminlogInURL || config.ADMIN_LOGIN_URL;

	options.debug = ("debug" in opts ? opts.debug : false);

	//
	logger.setOptions({output: options.debug});

	// -- --
	options.carbageCollectInterval = (opts.carbageCollectInterval || CARBAGE_INTERVAL);
	options.carbageIntervalId = setInterval(carbageCollection, options.carbageCollectInterval);

	options.sessionDeleteInterval = (opts.sessionDeleteInterval || SESSION_INTERVAL) * 1000;

	// -- --
	SESSIONTOKEN = (!options.isSecure ? "sessiontoken" : "sessiontoken_secure");

	// -- -- Locales
	if(isSpaceify)
		{
		fs.sync.readdir(options.localesPath).forEach(function(file, index)					// Create language object for each locale file
			{
			files = file.split(".");
			locales.push(files[0]);
			});
		}

	// -- --
	logger.info(utility.replace(language.WEBSERVER_CONNECTING, {"~protocol": options.protocol, "~hostname": options.hostname, "~port": options.port}));

	// -- --
	eventEmitter.on("processRequest", processRequest);					// Request events, process one page at a time

	// -- --
	if(!options.isSecure)												// Start a http server
		{
		webServer = http.createServer();
		}
	else																// Start a https server
		{
		key = fs.sync.readFile(options.key);
		crt = fs.sync.readFile(options.crt);
		caCrt = fs.sync.readFile(options.caCrt);

		webServer = https.createServer({ key: key, cert: crt, ca: caCrt });
		}

	webServer.listen(options.port, options.hostname, 511, function()
		{
		isOpen = true;

		if(serverUpListener)
			serverUpListener({isSecure: options.isSecure});

		callback(null, true);
		});

	webServer.on("request", function(request, response)
			{
			body = "";
			request.on("data", function(chunk)
				{
				body += chunk;
				});

			request.on("end", function()
				{
				requests.push({request: request, response: response, body: body});
				eventEmitter.emit("processRequest");
				});
			});

	webServer.on("error", function(err)
		{
		isOpen = false;

		if(serverDownListener)
			serverDownListener({isSecure: options.isSecure});

		callback(language.E_LISTEN_FATAL_ERROR.preFmt("WebServer()::connect", {"~hostname": options.hostname, "~port": options.port, "~err": err.toString()}), null);
		});

	webServer.on("close", function()
		{
		if(serverDownListener)
			serverDownListener({isSecure: options.isSecure});
		});
	};

self.close = function()
	{
	isOpen = false;

	if(webServer != null)
		{
		logger.info(utility.replace(language.WEBSERVER_CLOSING, {"~protocol": options.protocol, "~hostname": options.hostname, "~port": options.port}));

		webServer.close();
		webServer = null;
		}
	}

self.getIsOpen = function()
	{
	return isOpen;
	}

self.setServerUpListener = function(listener)
	{
	serverUpListener = (typeof listener == "function" ? listener : null);
	}

self.setServerDownListener = function(listener)
	{
	serverDownListener = (typeof listener == "function" ? listener : null);
	}

self.setRequestListener = function(listener)
	{
	requestListener = (typeof listener == "function" ? listener : null);
	}

// -- -- -- -- -- -- -- -- -- -- //
var processRequest = function()
	{
	var rrb;

	if(!processingRequest && requests.length > 0)
		{
		fibrous.run( function()
			{
			rrb = requests.shift();
			loadContent.sync(rrb.request, rrb.response, rrb.body);
			}, function(err, data) { } );
		}
	}

var loadContent = fibrous( function(request, response, body)
	{
	processingRequest = true;

	// ToDo: check request.method?

	var location;
	var reqLisObj;
	var requestUrl;
	var wwwPathType;
	var status = false;
	var wwwPath = options.wwwPath;
	var POST = parsePost(request, body);
	var cookies = parseCookies(request);
	var urlObj = url.parse(request.url, true);
	var urlObjUnmodified = url.parse(request.url, true);

	try {
		urlObj.pathname = urlObj.pathname.replace(/^\/*|\/*$/g, "");					// remove forward slash from the beginning and end

		if(requestListener)
			{
			reqLisObj = requestListener.sync(request, body, urlObj, options.isSecure);

			if(reqLisObj.type == "load")
				{
				wwwPath = reqLisObj.wwwPath;
				request.url = reqLisObj.pathname;
				urlObj.pathname = reqLisObj.pathname;
				urlObjUnmodified.pathname = reqLisObj.pathname;
				urlObj.pathname = urlObj.pathname.replace(/^\/*|\/*$/g, "");
				//status = load(reqLisObj.wwwPath, reqLisObj.pathname, request, response, urlObjUnmodified, urlObj.query, POST, cookies, reqLisObj.responseCode);
				}
			else if(reqLisObj.type == "write")
				status = write(reqLisObj.content, reqLisObj.contentType, request, response, reqLisObj.responseCode, reqLisObj.location, []);
			}

		if(status === false)															// Redirect back to directory if / is not at the end of the directory
			{
			wwwPathType = utility.sync.getPathType( checkURL(wwwPath, urlObj.pathname) );

			requestUrl = request.url;
			if(urlObj.search)
				requestUrl = requestUrl.replace(urlObj.search, "");
			if(urlObj.hash)
				requestUrl = requestUrl.replace(urlObj.hash, "");

			if(wwwPathType == "directory" && requestUrl.match(/[^\/]$/))
				{
				location = options.protocol + "://" + config.EDGE_HOSTNAME + (urlObj.port ? ":" + urlObj.port : "") + requestUrl + "/";
				if(urlObj.search)
					location += urlObj.search;
				if(urlObj.hash)
					location += urlObj.hash;

				status = redirect(request, response, 301, location, []);
				}
			}

		if(status === false)															// www
			status = load(wwwPath, urlObj.pathname, request, response, urlObjUnmodified, urlObj.query, POST, cookies);

		if(status === false)															// www + index file
			status = load(wwwPath, urlObj.pathname + "/" + options.indexFile, request, response, urlObjUnmodified, urlObj.query, POST, cookies);

		if(status === false)															// Not Found
			status = redirect(request, response, 404, "", []);

		if(typeof status !== "boolean" || status === false)
			throw status;
		}
	catch(err)
		{
		redirect(request, response, 500, "", []);										// Internal Server Error
		}
	finally
		{
		processingRequest = false;
		eventEmitter.emit("processRequest");
		}
	});

var load = function(wwwPath, pathname, request, response, urlObj, GET, POST, cookies, responseCode)
	{
	var file;
	var html;
	var contentType;
	var status = false;
	var isLogInPage = false;
	var isSecurePage = false; 
	var isAngularJS = false;
	var isOperationPage = false;

	try {
		wwwPath = checkURL(wwwPath, pathname);										// Check URL validity

		if(!utility.sync.isLocal(wwwPath, "file"))									// Return if file is not found
			throw false;

		file = fs.sync.readFile(wwwPath);											// Get the file content

		contentType = pathname.lastIndexOf(".");									// Get content type of the file
		contentType = pathname.substr(contentType + 1, pathname.length - contentType - 1);

		html = file.toString().match(regxHTML);										// The <head ...> tag has the required information

		if(html)																	// Reqular or AngularJS webpage
			{ // e.g., <html ng-app spaceify-secure spaceify-is-login> -> ['html', 'ng-app', 'spaceify-secure', 'spaceify-is-login']
			if(html[0].indexOf("ng-app") != -1 || html[0].indexOf("ng-app-spaceify") != -1)
				isAngularJS = true;

			if(html[0].indexOf("spaceify-secure") != -1)
				isSecurePage = true;

			if(html[0].indexOf("spaceify-is-login") != -1)
				isLogInPage = isSecurePage = true;

			if(html[0].indexOf("spaceify-operation") != -1)
				isOperationPage = true;
			}

		if(isOperationPage)
			status = renderOperationPage.sync(request, response, GET, POST, cookies);
		else if(isAngularJS)														// The web page contains AngularJS
			status = renderAngularJS(file, contentType, pathname, isSecurePage, isLogInPage, request, response, urlObj, GET, POST, cookies, responseCode);
		else																		// Regular web page
			status = renderHTML.sync(file, contentType, request, response, responseCode);
		}
	catch(err)
		{
		}

	return status;
	}

var renderHTML = fibrous( function(file, contentType, request, response, responseCode)
	{
	return write(file, contentType, request, response, responseCode, "", []);
	});

var renderOperationPage = fibrous( function(request, response, GET, POST, cookies)
	{
	var userData;
	var operation;
	var data = null;
	var sessiontoken;
	var error = null;
	var headers = [];
	var operationData;

	if(!POST["data"])
		error = errorc.errorFromObject(language.E_RENDER_OPERATION_PAGE_INVALID_DATA_POST);
	else
		{
		// SESSION
		sessiontoken = manageSessions(cookies, config.EDGE_HOSTNAME, "/");

		// HEADERS
		headers.push["Set-Cookie", sessions[sessiontoken].cookie];

		// OPERATION
		operation = utility.parseJSON(POST["data"].body, true);

		userData = sessions[sessiontoken].userData;

		operationData = webOperation.sync.getData(operation, userData, options.isSecure);

		//if(operationData.error && operationData.error.code == 2)								// Admin is not logged in
		//	return redirect(request, response, 301, config.ADMIN_LOGIN_URL, []);

		data = operationData.data;
		error = operationData.error;
		}

	return write(JSON.stringify({err: error, data: data}), "json", request, response, null, "", headers);
	});

var renderAngularJS = function(file, contentType, pathname, isSecurePage, isLogInPage, request, response, urlObj, GET, POST, cookies, responseCode)
	{
	var head;
	var script;
	var section;
	var headers = [];
	var sessiontoken;
	var operationData;
	var locale = config.DEFAULT_LOCALE;

	// SESSIONS -- -- -- -- -- -- -- -- -- -- //
	sessiontoken = manageSessions(cookies, config.EDGE_HOSTNAME, "/");

	// GET THE LOCALE / LANGUAGE FOR THE CURRENT SESSION
	if(GET && GET.locale)
		locale = GET.locale;
	else if(POST.locale)
		locale = POST.locale;
	else if(cookies.locale)
		locale = cookies.locale.value;
	else if(options.locale)
		locale = options.locale;

	// HEADER -- -- -- -- -- -- -- -- -- -- //
	headers = [];
	headers.push(["Set-Cookie", "locale=" + locale]);
	headers.push(["Set-Cookie", sessions[sessiontoken].cookie]);

	// SECURITY CHECK - REDIRECTIONS -- -- -- -- -- -- -- -- -- -- //
	if(!options.isSecure && isSecurePage)												// Redirect secure pages to secure server
		return redirect(request, response, 301, utility.parseURLFromURLObject(urlObj, config.EDGE_HOSTNAME, "https", urlObj.port), headers);
	else if(options.isSecure && isSecurePage)
		{
		operationData = webOperation.sync.getData({ type: "isAdminLoggedIn" }, sessions[sessiontoken].userData, options.isSecure);

		if(operationData.error)															// Internal Server Error
			return redirect(request, response, 500, "", headers);
		else if(!operationData.isLoggedIn && !isLogInPage)								// Redirect to log in if not logged in
			return redirect(request, response, 301, config.ADMIN_LOGIN_URL, headers);
		else if(operationData.isLoggedIn && isLogInPage)								// Redirect to index if already logged in
			return redirect(request, response, 301, config.ADMIN_INDEX_URL, headers);
		}

	section = pathname.replace(/\.[^.]*$/, "");
	section = section.replace(/^\//, "");
	section = section.toLowerCase();

	// INJECT JAVASCRIPT -- -- -- -- -- -- -- -- -- -- //
	head = file.toString().match(regxAngularJSHead);

	if(head)
		{
		script = "\t\tvar spaceifyPage = " + JSON.stringify({
						//ip: request.connection.remoteAddress;							// Proxy? -> request.headers["x-forwarded-for"],
						locale: locale,
						locales, locales,
						section: section,
						protocol: options.protocol,
						isSecure: options.isSecure,
						urlHttp: "http://" + config.EDGE_HOSTNAME + "/",
						urlHttps: "https://" + config.EDGE_HOSTNAME + "/",
						url: options.protocol + "://" + config.EDGE_HOSTNAME + "/"
						}) + ";\r\n";

		script = "\r\n\r\n\t\t<script>\r\n" + script + "\t\t</script>\r\n";

		file = file.slice(0, head.index) + head[0] + script + file.slice(head[0].length + head.index);
		}

	// RETURN PAGE -- -- -- -- -- -- -- -- -- -- //
	return write(file, contentType, request, response, responseCode, "", headers);
	}

var redirect = function(request, response, responseCode, location, headers)
	{
	var content = "";

	if(responseCode == 301)
		content = utility.replace(language.E_MOVED_PERMANENTLY.message, {"~location": location, "~serverName": options.serverName, "~hostname": options.hostname, "~port": options.port});
	else if(responseCode == 302)
		content = utility.replace(language.E_MOVED_FOUND.message, {"~location": location, "~serverName": options.serverName, "~hostname": options.hostname, "~port": options.port});
	else if(responseCode == 404 || responseCode == 500)
		content = fs.sync.readFile(options.wwwErrorsPath + responseCode + ".html");

	return write(content, "html", request, response, responseCode, location, headers);
	}

var write = function(content, contentType, request, response, responseCode, location, headers)
	{
	var now = new Date();

	headers.push(["Content-Type", (contentTypes[contentType] ? contentTypes[contentType] : "text/plain"/*application/octet-stream*/) + "; charset=utf-8"]);
	headers.push(["Accept-Ranges", "bytes"]);
	headers.push(["Content-Length", content.length]);
	headers.push(["Server", options.serverName]);
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
	var contentType;

	try {
		if(request.method.toLowerCase() != "post")
			throw "";

		if(!request.headers["content-type"])
			throw "";

		contentType = request.headers["content-type"].toLowerCase();

		if(contentType.indexOf("application/x-www-form-urlencoded") != -1)
			post = qs.parse(body);
		else if(contentType.indexOf("multipart/form-data") != -1)
			post = utility.parseMultiPartData(contentType, body, true);
		}
	catch(err)
		{}

	return post;
	}

var checkURL = function(wwwPath, pathname)
	{
	// The pathname must be checked so that loading is possible only from the supplied wwwPath
	pathname = pathname.replace(/\.\./g, "");							// prevent ../ attacks, e.g. displaying /../../../../../../../../../../../../../../../etc/shadow
	pathname = pathname.replace(/\/{2,}/g, "");

	pathname = pathname.replace(/(\[.*?\])|(\{.*?\})/g, "");			// ranges

	pathname = pathname.replace(/[~*^|?$\[\]{}\\]/g, "");				// characters

	wwwPath = wwwPath + pathname;										// Can not have something//something
	wwwPath = wwwPath.replace(/\/{2,}/g, "/");

	return wwwPath;
	}

	// SERVER SIDE SESSIONS - IMPLEMENTED USING HTTP COOKIES -- -- -- -- -- -- -- -- -- -- //
var manageSessions = function(cookies, domain, path)
	{
	var sessiontoken = (cookies[SESSIONTOKEN] ? cookies[SESSIONTOKEN].value : null);
	var session = sessions.hasOwnProperty(sessiontoken) ? sessions[sessiontoken] : null;

	if(!session)														// Create a session if it doesn't exist yet
		sessiontoken = createSession(domain, path);
	else																// Update an existing session
		sessions[sessiontoken].timestamp = Date.now();

	return sessiontoken;
	}

var createSession = function(Domain, Path)
	{
	var shasum = crypto.createHash("sha512");
	shasum.update( utility.bytesToHexString(crypto.randomBytes(16)) );
	var sessiontoken = shasum.digest("hex").toString();

	var cookie = SESSIONTOKEN + "=" + sessiontoken + "; Path=" + Path + "; Domain=" + Domain + "; HttpOnly";
	if(options.isSecure)
		cookie += "; Secure";

	sessions[sessiontoken] = {userData: {}, timestamp: Date.now(), "cookie": cookie}

	return sessiontoken;
	}

self.destroySessions = function()
	{
	sessions = {};
	}
	
var parseCookies = function(request)
	{
	var name_value;
	var cookies = {};
	var cookie = (request.headers.cookie || request.headers.Cookie || "").split(";");

	for(var i = 0; i < cookie.length; i++)
		{
		name_value = cookie[i].split("=");
		if(name_value.length == 2)
			cookies[name_value[0].trim()] = {value: name_value[1].trim(), cookie: cookie[i]};
		}

	return cookies;
	}

	// CARBAGE COLLECTION -- -- -- -- -- -- -- -- -- -- //
var carbageCollection = function()
	{
	var sts = Object.keys(sessions);									// Remove expired sessions

	for(var i = 0; i < sts.length; i++)
		{
		if(Date.now() - sessions[sts[i]].timestamp >= options.sessionDeleteInterval)
			delete sessions[sts[i]];
		}
	}

}

module.exports = WebServer;
