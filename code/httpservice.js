"use strict";

/**
 * Spaceify Http Service, 17.6.2015 Spaceify Oy
 *
 * @class HttpService
 */

var url = require("url");
var fibrous = require("fibrous");
var Logger = require("./logger");
var language = require("./language");
var WebServer = require("./webserver");
var SecurityModel = require("./securitymodel");
var SpaceifyConfig = require("./spaceifyconfig");
var SpaceifyUtility = require("./spaceifyutility");
var ValidateApplication = require("./validateapplication");
var WebSocketRpcConnection = require("./websocketrpcconnection");

function HttpService()
{
var self = this;

var logger = new Logger();
var httpServer = new WebServer();
var httpsServer = new WebServer();
var config = new SpaceifyConfig();
var utility = new SpaceifyUtility();
var coreConnection = new WebSocketRpcConnection();
var securityModel = new SecurityModel();

var edgeSettings = {};
var coreDisconnectionTimerId = null;

var key = config.SPACEIFY_TLS_PATH + config.SERVER_KEY;
var crt = config.SPACEIFY_TLS_PATH + config.SERVER_CRT;
var caCrt = config.SPACEIFY_WWW_PATH + config.SPACEIFY_CRT;

var apps = [];																							// Spacelets, applications and native applications

self.start = fibrous( function()
	{
	process.title = "spaceifyhttp";																		// Shown in ps aux

	try	{
		// Set listeners
		httpServer.setServerUpListener(serverUpListener);
		httpServer.setServerDownListener(serverDownListener);
		httpsServer.setServerUpListener(serverUpListener);
		httpsServer.setServerDownListener(serverDownListener);

		httpServer.setRequestListener(requestListener);
		httpsServer.setRequestListener(requestListener);

		// Connect
		createHttpServer.sync(false);
		createHttpServer.sync(true);

		// Setup a connection to the core
		coreConnection.setDisconnectionListener(coreDisconnectionListener);

		coreConnection.exposeRpcMethod(config.EVENT_APPLICATION_INSTALLED, self, applicationInstalled);
		coreConnection.exposeRpcMethod(config.EVENT_APPLICATION_REMOVED, self, applicationRemoved);
		coreConnection.exposeRpcMethod(config.EVENT_APPLICATION_STARTED, self, applicationStarted);
		coreConnection.exposeRpcMethod(config.EVENT_APPLICATION_STOPPED, self, applicationStopped);
		coreConnection.exposeRpcMethod(config.EVENT_SPACELET_INSTALLED, self, spaceletInstalled);
		coreConnection.exposeRpcMethod(config.EVENT_SPACELET_REMOVED, self, spaceletRemoved);
		coreConnection.exposeRpcMethod(config.EVENT_SPACELET_STARTED, self, spaceletStarted);
		coreConnection.exposeRpcMethod(config.EVENT_SPACELET_STOPPED, self, spaceletStopped);
		coreConnection.exposeRpcMethod(config.EVENT_NATIVE_APPLICATION_INSTALLED, self, nativeApplicationInstalled);
		coreConnection.exposeRpcMethod(config.EVENT_NATIVE_APPLICATION_REMOVED, self, nativeApplicationRemoved);
		coreConnection.exposeRpcMethod(config.EVENT_NATIVE_APPLICATION_STARTED, self, nativeApplicationStarted);
		coreConnection.exposeRpcMethod(config.EVENT_NATIVE_APPLICATION_STOPPED, self, nativeApplicationStopped);
		coreConnection.exposeRpcMethod(config.EVENT_EDGE_SETTINGS_CHANGED, self, edgeSettingsChanged);

		connectToCore.sync();

		/*var uid = parseInt(process.env.SUDO_UID);														// ToDo: No super user rights
		if(uid)
			process.setuid(uid);*/
		}
	catch(err)
		{
		logger.error(err, true, true, logger.ERROR);
		}
	});

var createHttpServer = fibrous( function(isSecure)
	{
	var server = (!isSecure ? httpServer : httpsServer);

	server.listen.sync({hostname: config.ALL_IPV4_LOCAL,
						 port: (!isSecure ? config.EDGE_PORT_HTTP : config.EDGE_PORT_HTTPS),
						 isSecure: isSecure,
						 key: key,
						 crt: crt,
						 caCrt: caCrt,
						 indexFile: config.INDEX_HTML,
						 wwwPath: config.SPACEIFY_WWW_PATH,
						 locale: config.DEFAULT_LOCALE,
						 localesPath: config.LOCALES_PATH,
						 serverName: config.SERVER_NAME,
						 debug: true
						 });
	});

var connectToCore = fibrous( function()
	{ // Establish connection to the core service
	var i;
	var sessionId;
	var applicationData;

	try {
		coreConnection.sync.connect({hostname: config.CONNECTION_HOSTNAME, port: config.CORE_PORT_SECURE, isSecure: true, caCrt: caCrt, debug: true});

		sessionId = securityModel.sync.createTemporarySession("127.0.0.1");

		edgeSettings = coreConnection.sync.callRpc("getEdgeSettings", [sessionId], self);

		applicationData = coreConnection.sync.callRpc("getApplicationData", [], self)

		for(i = 0; i < applicationData["spacelet"].length; i++)
			addApp(applicationData["spacelet"][i]);

		for(i = 0; i < applicationData["sandboxed"].length; i++)
			addApp(applicationData["sandboxed"][i]);

		for(i = 0; i < applicationData["native"].length; i++)
			addApp(applicationData["native"][i]);

		coreConnection.callRpc("setEventListeners",	[ 	[
														config.EVENT_APPLICATION_INSTALLED,
														config.EVENT_APPLICATION_REMOVED,
														config.EVENT_APPLICATION_STARTED,
														config.EVENT_APPLICATION_STOPPED,
														config.EVENT_SPACELET_INSTALLED,
														config.EVENT_SPACELET_REMOVED,
														config.EVENT_SPACELET_STARTED,
														config.EVENT_SPACELET_STOPPED,
														config.EVENT_NATIVE_APPLICATION_INSTALLED,
														config.EVENT_NATIVE_APPLICATION_REMOVED,
														config.EVENT_NATIVE_APPLICATION_STARTED,
														config.EVENT_NATIVE_APPLICATION_STOPPED,
														config.EVENT_EDGE_SETTINGS_CHANGED
														],
														sessionId
													]);
		}
	catch(err)
		{
		coreDisconnectionListener(-1);
		}
	finally
		{
		securityModel.sync.destroyTemporarySession();
		}
	});

var serverUpListener = function(server)
	{
	}

var serverDownListener = function(server)
	{
	setTimeout(function(isSecure)
		{
		fibrous.run(
			function()
				{
				createHttpServer.sync(isSecure);
				},
			function(err, data)
				{
				});
		}, config.RECONNECT_WAIT, server.isSecure);
	}

var coreDisconnectionListener = function(id)
	{
	if(coreDisconnectionTimerId != null)
		return;

	if(httpServer)													// Did core's server go down or did core shut down? Either way, the log in sessions are revoked.
		httpServer.destroySessions();
	if(httpsServer)
		httpsServer.destroySessions();

	coreDisconnectionTimerId = setTimeout(
		function()
			{
			coreDisconnectionTimerId = null;

			fibrous.run(
				function()
					{
					connectToCore.sync();
					},
				function(err, data)
					{
					});
			}, config.RECONNECT_WAIT);
	}

	// EXPOSED METHODS / EVENT LISTENERS -- -- -- -- -- -- -- -- -- --
var applicationInstalled = function(result) { addApp(result.manifest); }
var applicationRemoved = function(result) { remApp(result.manifest.unique_name); }
var applicationStarted = function(startObject) { setAppRunningState(startObject.manifest.unique_name, true); }
var applicationStopped = function(result) { setAppRunningState(result.manifest.unique_name, false); }

var spaceletInstalled = function(result) { addApp(result.manifest); }
var spaceletRemoved = function(result) { remApp(result.manifest.unique_name); }
var spaceletStarted = function(startObject) { setAppRunningState(startObject.manifest.unique_name, true); }
var spaceletStopped = function(result) { setAppRunningState(result.manifest.unique_name, false); }

var nativeApplicationInstalled = function(result) { addApp(result.manifest); }
var nativeApplicationRemoved = function(result) { remApp(result.manifest.unique_name); }
var nativeApplicationStarted = function(startObject) { setAppRunningState(startObject.manifest.unique_name, true); }
var nativeApplicationStopped = function(result) { setAppRunningState(result.manifest.unique_name, false); }

var edgeSettingsChanged = function(settings) { edgeSettings = settings; }

var requestListener = function(request, body, urlObj, isSecure, callback)
	{
	var service;
	var pathPos, appPos;
	var pathname = urlObj.pathname.replace(/^\/|\/$/, "");
	var pathnameLength = pathname.length;
	var pathparts = pathname.split("/");
	var part = pathparts.shift() || "";
	var responseCode, contentType, port, location, content;

	// Redirection request to apps internal web server "service/" or get apps service object "service/object/" -- -- -- -- -- -- -- -- -- --
	if(part == "service")
		{
		part = "service/" + (pathparts.length > 0 && pathparts[0] == "object" ? "object/" : "");

		if(!(service = coreConnection.sync.callRpc("getService", [config.HTTP, pathname.replace(part, "")], self)))
			return callback(null, {type: "load", wwwPath: "", pathname: "", responseCode: 404});

		if(part == "service/")
			{
			responseCode = 302;
			contentType = "html";
			port = (!isSecure ? service.port : service.securePort);
			location = (!isSecure ? "http" : "https") + "://" + config.EDGE_HOSTNAME + ":" + port + utility.remakeQueryString(urlObj.query, [], {}, "/");
			content = utility.replace(language.E_MOVED_FOUND.message, {"~location": location, "~serverName": config.SERVER_NAME, "~hostname": "", "~port": port});
			}
		else
			{
			responseCode = 200;
			contentType = "json";
			content = JSON.stringify(service);
			}

		callback(null, {type: "write", content: content, contentType: contentType, responseCode: responseCode, location: location});
		}
	// Path points to apps resource -- -- -- -- -- -- -- -- -- --
	else
		{
		for(appPos = 0; appPos < apps.length; appPos++)								// Loop through installed apps
			{
			for(pathPos = 0; pathPos < pathnameLength; pathPos++)					// Compare unique_name with pathname from the beginning
				{
				if(pathPos > apps[appPos].lengthM1 || pathname[pathPos] != apps[appPos].unique_name[pathPos])
					break;
				}

			if(pathPos == apps[appPos].length)										// The beginning of the pathname was same
				{																	// but it must end with "/" or "" to be
				part = pathname[pathPos] || "";										// completely identical with the unique_name
																					// E.g. path = s/a/image.jpg, unique_name = s/a -> ok
				if(part == "/" || part == "")										//      path = s/a1/image.jpg, unique_name = s/a -> not ok
					{																
					part = urlObj.path.replace(apps[appPos].unique_name + part, "");

					callback(null, {type: "load", wwwPath: apps[appPos].wwwPath, pathname: part, responseCode: null});
					}

				break;
				}
			}

		if(appPos == apps.length)
			callback(null, {type: ""});
		}
	}

	// UTILITY -- -- -- -- -- -- -- -- -- --
var addApp = function(manifest)
	{
	var length;
	var wwwPath;
	var isRunning = ("isRunning" in manifest ? manifest.isRunning : false);

	// wwwPath is the path on the file system to spacelets, applications or native applications www directory.
	// e.g. /var/lib/spaceify/data/sandboxed/spaceify/bigscreen/volume/application/www/
	wwwPath = manifest.unique_name + "/" + config.VOLUME_DIRECTORY + config.APPLICATION_DIRECTORY + config.WWW_DIRECTORY;

	if(manifest.type == config.SPACELET)
		wwwPath = config.SPACELETS_PATH + wwwPath;
	else if(manifest.type == config.SANDBOXED)
		wwwPath = config.SANDBOXED_PATH + wwwPath;
	else if(manifest.type == config.NATIVE)
		wwwPath = config.NATIVE_PATH + wwwPath;

	length = manifest.unique_name.length;
	apps.push({unique_name: manifest.unique_name, length: length, lengthM1: length - 1, isRunning: isRunning, wwwPath: wwwPath});
	}

var remApp = function(unique_name)
	{
	var index;

	if((index = getAppIndex(unique_name)) != -1)
		apps.splice(index, 1);
	}

var setAppRunningState = function(unique_name, state)
	{
	var index;

	if((index = getAppIndex(unique_name)) != -1)
		apps[index].isRunning = state;
	}

var getAppIndex = function(unique_name)
	{
	for(var i = 0; i < apps.length; i++)
		{
		if(apps[i].unique_name == unique_name)
			return i;
		}

	return -1;
	}

}

fibrous.run( function()
	{
	var httpService = new HttpService();
	httpService.start.sync();
	}, function(err, data) { } );