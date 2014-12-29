var fs = require("fs");
var fibrous = require("fibrous");
var logger = require("./api/logger");
var Const = require("./api/constants");
var Config = require("./api/config")();
var Utility = require("./api/utility");
var Language = require("./api/language");
var WebServer = require('./api/webserver');
var WebSocketRPCClient = require("./api/websocketrpcclient");
var WebSocketRPCServer = require("./api/websocketrpcserver");

function Example()
{
	var self = this;

	var httpPort = 80;
	var httpsPort = 443;
	var service_port = Const.FIRST_SERVICE_PORT;

	var spaceifyRPCClient = new WebSocketRPCClient();
	var appRPCServer = new WebSocketRPCServer();
	var otherAppRPCClient = new WebSocketRPCClient();
	var httpServer = new WebServer();
	var httpsServer = new WebServer();

	self.start = fibrous( function()
	{
		try
		{
			/*// Get and parse manifest
			var manifestFile = fs.sync.readFile("spaceify.manifest", {"encoding": "utf8"});
			var manifest = Utility.parseManifest(manifestFile);*/

			spaceifyRPCClient.sync.connect({hostname: Config.EDGE_HOSTNAME, port: Config.CORE_PORT_WEBSOCKET, persistent: true});

			appRPCServer.connect.sync({hostname: null, port: service_port});	// next service would get service_port + 1
			appRPCServer.exposeRPCMethod("exampleMethod", self, exampleMethod);

			/*var service = spaceifyRPCClient.sync.call("findService", ["spaceify.org/services/example_service_2"], self);
			if(service)
				otherAppRPCClient.sync.connect({hostname: null, port: service.port, persistent: true});*/

			httpServer.connect.sync({hostname: null, port: httpPort});

			var key = fs.readFileSync(Config.APPLICATION_PATH + Config.SSL_DIRECTORY + Const.APPLICATION_KEY);
			var cert = fs.readFileSync(Config.APPLICATION_PATH + Config.SSL_DIRECTORY + Const.APPLICATION_CRT);
			httpsServer.connect.sync({hostname: null, port: httpsPort, isSsl: true, sslKey: key, sslCert: cert});

			spaceifyRPCClient.sync.call("registerService", ["spaceify.org/services/example_service_1"], self);

			spaceifyRPCClient.sync.call("initialized", [true, null], self);
		}

		catch(err)
		{
			logger.error(err.message);
			spaceifyRPCClient.sync.call("initialized", [false, err.message], self);
			self.sync.stop();
		}
		finally
		{
			spaceifyRPCClient.sync.close();
		}
	});

	self.stop = fibrous( function()
	{
		if(appRPCServer != null)
			appRPCServer.sync.close();

		if(otherAppRPCClient != null)
			otherAppRPCClient.sync.close();

		if(httpServer)
			httpServer.sync.close();

		if(httpsServer)
			httpsServer.sync.close();
	});

	var exampleMethod = fibrous( function(param)
	{
		var str = "Hello, " + param + " (" + (new Date).getTime() + ")";

		return str;
	});

}

fibrous.run(function()
	{
	example = new Example();
	example.sync.start();
	});
