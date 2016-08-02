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
var SpaceifyConfig = require("./spaceifyconfig");
var ValidateApplication = require("./validateapplication");
var SpaceifyUtility = require("./spaceifyutility");
var WebSocketRpcConnection = require("./websocketrpcconnection");

function HttpService()
{
var self = this;

var logger = new Logger();
var httpServer = new WebServer();
var httpsServer = new WebServer();
var config = new SpaceifyConfig();
var utility = new SpaceifyUtility();
var validator = new ValidateApplication();
var coreConnection = new WebSocketRpcConnection();

var coreDisconnectionTimerId = null;

var key = config.SPACEIFY_TLS_PATH + config.SERVER_KEY;
var crt = config.SPACEIFY_TLS_PATH + config.SERVER_CRT;
var caCrt = config.SPACEIFY_WWW_PATH + config.SPACEIFY_CRT;

self.start = fibrous( function()
	{
	process.title = "spaceifyhttp";																		// Shown in ps aux

	try	{
		// Set listeners
		httpServer.setServerUpListener(serverUpListener);
		httpServer.setServerDownListener(serverDownListener);
		httpsServer.setServerUpListener(serverUpListener);
		httpsServer.setServerDownListener(serverDownListener);

		httpServer.setExternalRequestListener(externalRequestListener);
		httpsServer.setExternalRequestListener(externalRequestListener);

		// Connect
		connectServer.sync(false);
		connectServer.sync(true);

		// Setup a connection to the core
		coreConnection.setDisconnectionListener(coreDisconnectionListener);

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

var connectServer = fibrous( function(isSecure)
	{
	var server = (!isSecure ? httpServer : httpsServer);
	server.connect.sync({hostname: config.ALL_IPV4_LOCAL,
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
	try {
		coreConnection.sync.connect({hostname: config.ALL_IPV4_LOCAL, port: config.CORE_PORT_SECURE, isSecure: true, caCrt: caCrt, debug: true});
		}
	catch(err)
		{
		coreDisconnectionListener(-1);
		}
	});

var serverUpListener = function(server)
	{
	}

var serverDownListener = function(server)
	{
	setTimeout(function(isSecure)
		{
		fibrous.run( function() { connectServer.sync(isSecure); }, function(err, data) { } );
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

	coreDisconnectionTimerId = setTimeout(function()
		{
		coreDisconnectionTimerId = null;
		fibrous.run( function() { connectToCore.sync(); }, function(err, data) { } );
		}, config.RECONNECT_WAIT);
	}

var externalRequestListener = function(request, body, isSecure, callback)
	{
	var urlObj = url.parse(request.url, true);

	var spath = urlObj.pathname.replace(/^\/|\/$/, "");
	var pathparts = spath.split("/");
	var type = pathparts[0];

	// ----- Load files from <type>/<unique_name>/volume/application/www directory -----
	if(pathparts.length > 0 && (type == "spacelet" || type == "sandboxed" || type == "native"))
		{
		var unique_name = urlObj.path.replace(new RegExp("/" + type + "/"), "");
			unique_name = unique_name.replace(/\/get.*/, "");
		var path = urlObj.path.replace(new RegExp("/" + type + "/" + unique_name + "/get/"), "");

		var basePath = validator.makeUniqueDirectory(unique_name, false) + config.VOLUME_DIRECTORY + config.APPLICATION_DIRECTORY + config.WWW_DIRECTORY;

		var typePath = "";
		if(type == config.SPACELET)
			typePath = config.SPACELETS_PATH;
		else if(type == config.SANDBOXED)
			typePath = config.SANDBOXED_PATH;
		else if(type == config.NATIVE)
			typePath = config.NATIVE_PATH;

		callback(null, {type: "load", wwwPath: typePath + basePath, pathname: path, responseCode: null});
		}

	// ----- Redirection request to applications internal web server -----
	else if(pathparts.length > 0 && type == "service")
		{
		var service = null;
		var isObject = (pathparts.length > 1 && pathparts[1] == "object" ? true : false);

		if(coreConnection.getIsOpen())
			{
			try { service = coreConnection.sync.callRpc("getService", [config.HTTP, spath.replace((!isObject ? "service/" : "service/object/"), "")], self); }
			catch(err) { logger.error(err, true, true, logger.ERROR); }
			}

		if(service)
			{
			if(!isObject)
				{
				var responseCode = 302;
				var contentType = "html";
				var port = (!isSecure ? service.port : service.securePort);
				var location = (!isSecure ? "http" : "https") + "://" + config.EDGE_HOSTNAME + ":" + port + utility.remakeQueryString(urlObj.query, [], {}, "/");
				var content = utility.replace(language.E_MOVED_FOUND.message, {"~location": location, "~serverName": config.SERVER_NAME, "~hostname": "", "~port": port});
				}
			else
				{
				var responseCode = 200;
				var contentType = "json";
				var content = JSON.stringify(service);
				}

			callback(null, {type: "write", content: content, contentType: contentType, responseCode: responseCode, location: location});
			}
		else
			callback(null, {type: "load", wwwPath: "", pathname: "", responseCode: 404});
		}
	else
		callback(null, true);
	}

}

fibrous.run( function()
	{
	var httpService = new HttpService();
	httpService.start.sync();
	}, function(err, data) { } );