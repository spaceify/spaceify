#!/usr/bin/env node
/**
 * Spaceify Http Service, 17.6.2015 Spaceify Inc.
 *
 * @class HttpService
 */

var url = require("url");
var fibrous = require("fibrous");
var logger = require("./www/libs/logger");
var utility = require("./utility");
var config = require("./config")();
var language = require("./language");
var WebServer = require("./webserver");
var ValidateApplication = require("./validateapplication");
var WebSocketRPCConnection = require("./websocketrpcconnection");

function HttpService()
{
var self = this;

var httpServer = new WebServer();
var httpsServer = new WebServer();

var coreRPC = null;

var validator = new ValidateApplication();

var key = config.SPACEIFY_TLS_PATH + config.SERVER_KEY;
var crt = config.SPACEIFY_TLS_PATH + config.SERVER_CRT;
var ca_crt = config.SPACEIFY_WWW_PATH + config.SPACEIFY_CRT;

var owner = "HttpService";

var hostname = null;
var server_name = config.SERVER_NAME;

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
		connectToCore.sync();

		/*var uid = parseInt(process.env.SUDO_UID);														// ToDo: No super user rights
		if(uid)
			process.setuid(uid);*/
		}
	catch(err)
		{
		logger.printErrors(err, true, true, 0);
		}
	});

var connectServer = fibrous( function(is_secure)
	{
	var server = (!is_secure ? httpServer : httpsServer);
	server.connect.sync({hostname: null,
						 port: (!is_secure ? config.EDGE_PORT_HTTP : config.EDGE_PORT_HTTPS),
						 is_secure: is_secure,
						 key: key,
						 crt: crt,
						 ca_crt: ca_crt,
						 kiwi_used: true,
						 index_file: config.INDEX_FILE,
						 www_path: config.SPACEIFY_WWW_PATH,
						 template_path: config.TEMPLATES_PATH,
						 language_path: config.LANGUAGES_PATH,
						 layout_pathname: config.LAYOUT_PATHNAME,
						 locale: config.DEFAULT_LOCALE,
						 owner: owner,
						 server_name: server_name
						 });
	});

var connectToCore = fibrous( function()
	{ // Establish connection to the core service
	try {
		coreRPC = new WebSocketRPCConnection();
		coreRPC.setDisconnectionListener(coreConnectionsListener);

		coreRPC.sync.connect({hostname: null, port: config.CORE_PORT_WEBSOCKET_SECURE, is_secure: true, ca_crt: ca_crt, persistent: true, owner: owner});
		}
	catch(err)
		{
		coreConnectionsListener(null);
		}
	});

var serverUpListener = function(server)
	{
	}

var serverDownListener = function(server)
	{
	setTimeout(function(is_secure)
		{
		fibrous.run( function() { connectServer.sync(is_secure); }, function(err, data) { } );
		}, config.RECONNECT_WAIT, server.is_secure);
	}

var coreConnectionsListener = function(connection)
	{ // Disconnection and failed connection listener
	setTimeout(function()
		{
		fibrous.run( function() { coreRPC = null; connectToCore.sync(); }, function(err, data) { } );
		}, config.RECONNECT_WAIT);
	}

var externalRequestListener = function(request, body, is_secure, protocol, callback)
	{
	var purl = url.parse(request.url, true);

	var spath = purl.pathname.replace(/^\/|\/$/, "");
	var pathparts = spath.split("/");

	// ----- Load files from <type>/<unique_name>/volume/application/www directory -----
	if(pathparts.length > 0 && (pathparts[0] == "_spacelet" || pathparts[0] == "_sandboxed" || pathparts[0] == "_native"))
		{
		var type_path = "";
		var type = pathparts[0].replace("_", "");
		var path = purl.path.replace(/(\/_.*_)/, "");								// Remove the search part
		var unique_name = spath.match(/(_.*_)/)[0].replace(new RegExp(pathparts[0] + "\/"), "").replace("_", "");
		var base_path = validator.makeUniqueDirectory(unique_name) + config.VOLUME_DIRECTORY + config.APPLICATION_DIRECTORY + config.WWW_DIRECTORY;

		if(type == config.SPACELET)
			type_path = config.SPACELETS_PATH;
		else if(type == config.SANDBOXED)
			type_path = config.SANDBOXED_PATH;
		else if(type == config.NATIVE)
			type_path = config.NATIVE_PATH;
		/*else if(type == config.ANY)
			{
			if(utility.sync.isLocal((type_path = config.SPACELETS_PATH) + base_path + path, "file")) {}
			else if(utility.sync.isLocal((type_path = config.SANDBOXED_PATH) + base_path + pathparts, "file")) {}
			else if(utility.sync.isLocal((type_path = config.NATIVE_PATH) + base_path + pathparts, "file")) {}
			}*/

		callback(null, {type: "load", www_path: type_path + base_path, pathname: path, responseCode: null});
		}

	// ----- Redirection request to applications internal web server -----
	else if(pathparts.length > 0 && pathparts[0] == "service")
		{
		var service = null;

		if(coreRPC.isOpen())
			{
			try {
				service = coreRPC.sync.callRpc("getService", [(!is_secure ? config.HTTP_SERVICE : config.HTTPS_SERVICE), spath.replace("service/", "")], self);
				}
			catch(err)
				{
				console.log(err);
				}
			}

		if(service)
			{
			var location = protocol + "://" + request.headers["host"] + ":" + service.port + "/" + purl.search;
			var content = utility.replace(language.E_MOVED_FOUND.message, {":location": location, ":server_name": server_name, ":hostname": "", ":port": service.port});

			callback(null, {type: "write", content: content, contentType: "html", responseCode: 302, location: location});
			}
		else
			callback(null, {type: "kiwi", pathname: "404", query: purl.query, responseCode: 404});
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