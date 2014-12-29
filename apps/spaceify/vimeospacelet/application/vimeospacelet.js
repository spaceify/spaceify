#!/usr/bin/env node
/**
 * VimeoSpacelet, 25.9.2013 Spaceify Inc.
 * 
 * @class VimeoSpacelet
 */

var fs = require("fs");
var fibrous = require("fibrous");
var logger = require("./api/logger");
var Utility = require("./api/utility");
var Const = require("./api/constants");
var Config = require("./api/config")();
var WebServer = require('./api/webserver');
var WebSocketServer = require("./wsserver");
var WebSocketClient = require("./wsclient");
var WebSocketRPCClient = require("./api/websocketrpcclient");

function VimeoSpacelet()
{
	var self = this;

	var httpPort = 80;
	var httpsPort = 443;
	var service_port = Const.FIRST_SERVICE_PORT;

	var WSCommandServer = new WebSocketServer();
	var WSCommandClient = new WebSocketClient();
	var WSVimeoFServer = new WebSocketServer();
	var WSVimeoBServer = new WebSocketServer();
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

			// Establish a RPC websocket connection to the Spaceify Core
			rpcSpaceify.sync.connect({hostname: Config.EDGE_HOSTNAME, port: Config.CORE_PORT_WEBSOCKET, persistent: true, owner: "VimeoSpacelet"});

			// find the required service
			var service = rpcSpaceify.sync.call("findService", ["spaceify.org/services/bigscreen_frontend"], self);

			// SETUP A COMMAND CHANNEL: [user]<>[vimeospacelet::command|spacelet]<>[bigscreen::command_frontend|jsapp]
			WSCommandServer.sync.start({hostname: null, port: service_port++, proxyTo: WSCommandClient, oneConnection: false});			// user to spacelet
			WSCommandClient.sync.start({hostname: Config.EDGE_HOSTNAME, port: service.port, proxyTo: WSCommandServer});					// spacelet to jsapp

			// SETUP A VIMEO CHANNEL: [user]<>[vimeospacelet::frontend<<spacelet>>vimeospacelet::backend]<>[bigscreen]
			WSVimeoFServer.sync.start({hostname: null, port: service_port++, proxyTo: WSVimeoBServer, oneConnection: false});			// user to spacelet
			WSVimeoBServer.sync.start({hostname: null, port: service_port++, proxyTo: WSVimeoFServer, oneConnection: false});			// bigscreen video to spacelet

			// Start web servers
			httpServer.connect.sync({hostname: null, port: httpPort, owner: "VimeoSpacelet"});

			var key = fs.readFileSync(Config.APPLICATION_PATH + Config.SSL_DIRECTORY + Const.APPLICATION_KEY);
			var cert = fs.readFileSync(Config.APPLICATION_PATH + Config.SSL_DIRECTORY + Const.APPLICATION_CRT);
			result = httpsServer.connect.sync({hostname: null, port: httpsPort, isSsl: true, sslKey: key, sslCert: cert, owner: "VimeoSpacelet"});

			// Register provided services
			rpcSpaceify.sync.call(["registerService", "registerService", "registerService"], [["spaceify.org/services/vimeo_command"], ["spaceify.org/services/vimeo_frontend"], ["spaceify.org/services/vimeo_backend"]], self);

			// Let the Spaceify Core know this spacelet was succesfully initialized (= true)
			rpcSpaceify.sync.call("initialized", [true, null], self);
		}
		catch(err)
		{
			logger.error(err.message);

			// Let the Spaceify Core know this spacelet failed to initialize itself (= false)
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
		if(WSCommandServer != null)
			WSCommandServer.sync.close();
		if(WSCommandClient != null)
			WSCommandClient.sync.close();

		if(WSVideoFServer != null)
			WSVideoFServer.sync.close();
		if(WSVideoBServer != null)
			WSVideoBServer.sync.close();

		if(httpServer)
			httpServer.sync.close();
		if(httpsServer)
			httpsServer.sync.close()
	});

}

fibrous.run(function()
	{
	logger.setOptions({labels: logger.ERROR});

	var vimeoSpacelet = new VimeoSpacelet();
	vimeoSpacelet.sync.start();
	});
