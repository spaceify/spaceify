#!/usr/bin/env node
/**
 * BigScreen, 18.10.2013 Spaceify Inc.
 * 
 * @class BigScreen
 */

var fs = require("fs");
var fibrous = require("fibrous");
var logger = require("./api/logger");
var Const = require("./api/constants");
var Config = require("./api/config")();
var Utility = require("./api/utility");
var Language = require("./api/language");
var WebServer = require('./api/webserver');
var WebSocketServer = require("./wsserver");
var WebSocketRPCClient = require("./api/websocketrpcclient");

function BigScreen()
{
	var self = this;

	var httpPort = 80;
	var httpsPort = 443;
	var service_port = Const.FIRST_SERVICE_PORT;

	var bigscreenWS = new WebSocketServer();
	var spaceletWS = new WebSocketServer();
	var rpcSpaceify = new WebSocketRPCClient();
	var httpServer = new WebServer();
	var httpsServer = new WebServer();

	self.start = fibrous( function()
	{
		try
		{
			/*// Get and parse manifest
			var manifestFile = fs.sync.readFile("spaceify.manifest", {"encoding": "utf8"});
			var manifest = Utility.parseManifest(manifestFile);*/

			// RPC connection to the Spaceify Core
			rpcSpaceify.sync.connect({hostname: Config.EDGE_HOSTNAME, port: Config.CORE_PORT_WEBSOCKET, persistent: true, owner: "BigScreen"});

			// Init application
			bigscreenWS.sync.start({hostname: null, port: service_port++, proxyTo: spaceletWS, isBackend: true});		// bigscreen to jsapp
			spaceletWS.sync.start({hostname: null, port: service_port++, proxyTo: bigscreenWS, isBackend: false});		// spacelet to jsapp

			// Start web servers
			httpServer.connect.sync({hostname: null, port: httpPort, owner: "BigScreen"});

			var key = fs.readFileSync(Config.APPLICATION_PATH + Config.SSL_DIRECTORY + Const.APPLICATION_KEY);
			var cert = fs.readFileSync(Config.APPLICATION_PATH + Config.SSL_DIRECTORY + Const.APPLICATION_CRT);
			result = httpsServer.connect.sync({hostname: null, port: httpsPort, isSsl: true, sslKey: key, sslCert: cert, owner: "BigScreen"});

			// Register provided services
			rpcSpaceify.sync.call(["registerService", "registerService"], [["spaceify.org/services/bigscreen_frontend"], ["spaceify.org/services/bigscreen_backend"]], self);

			// Let the Spaceify Core know this sandboxed application was succesfully initialized (= true)
			rpcSpaceify.sync.call("initialized", [true, null], self);
		}
		catch(err)
		{
			logger.error(err.message);

			// Let the Spaceify Core know this js application failed to initialize itself (= false)
			rpcSpaceify.sync.call("initialized", [false, err.message], self);

			self.sync.stop();
		}
		finally
		{
			rpcSpaceify.sync.close();
		}
	});

	self.stop = fibrous( function()
	{
		if(bigscreenWS != null)
			bigscreenWS.sync.close();
		if(spaceletWS != null)
			spaceletWS.sync.close();

		if(httpServer)
			httpServer.sync.close();
		if(httpsServer)
			httpsServer.sync.close();
	});

}

fibrous.run(function()
	{
	logger.setOptions({labels: logger.ERROR});

	bigscreen = new BigScreen();
	bigscreen.sync.start();
	});
