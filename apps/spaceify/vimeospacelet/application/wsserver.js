#!/usr/bin/env node
/**
 * WebSocketServer, 23.9.2013 Spaceify Inc.
 * 
 * @class WebSocketServer
 */

var http = require('http');
var fibrous = require("fibrous");
var websocket = require('websocket').server;
var logger = require("./api/logger");

function WebSocketServer()
{
var self = this;

var options = {};
var wsServer = null;
var webServer = null;
var connections = {};
var connectionSequence = 0;
var err_no_connection = "";

self.start = function(opts, callback)
	{
	options.hostname = opts.hostname || "";
	options.port = opts.port || "";
	options.proxyTo = opts.proxyTo || null;
	options.oneConnection = opts.oneConnection || false;

	err_no_connection = "WebSocketServer has no connection to the " + options.hostname + ":" + options.port;

	// Start http server  // // // // // // // // // // // // // // // // // // // // // // // // //
	webServer = http.createServer
		(
		function(request, response)
			{
				response.writeHead(404);
				response.end();
			}
		);
		webServer.listen(options.port, options.hostname, 511, function() { callback(null, true); });
		logger.info("WebSocketServer listening on " + options.hostname + ":" + options.port + "/" + "json-rpc");

		// Create the WebSocket server // // // // // // // // // // // // // // // // // // // // // //
		wsServer = new websocket(
		{
			httpServer: webServer,
			autoAcceptConnections: false,

			keepalive: true,																// Keepalive connections and
			keepaliveInterval: 60000,														// ping them once a minute and
			dropConnectionOnKeepaliveTimeout: true,											// drop a connection if there's no answer
			keepaliveGracePeriod: 10000														// within the grace period.
		});

		// Connection requests   // // // // // // // // // // // // // // // // // // // // // // // //
		wsServer.on('request', function(request)
		{
			try
			{
				if(options.oneConnection && typeof connections[connectionSequence] != "undefined")	// Accept only one connection at a time
				{
					logger.info("WebSocketServer " + options.hostname + ":" + options.port + " closing existing connection");
					connections[connectionSequence].close();
				}

				connectionSequence++;
				connections[connectionSequence] = request.accept("json-rpc", request.origin);
				connections[connectionSequence].connectionSequence = connectionSequence;
				logger.info("WebSocketServer accepted connection on " + options.hostname + ":" + options.port + "/" + "json-rpc");

				connections[connectionSequence].on('message', function(message)
				{
					logger.info("WebSocketServer " + options.hostname + ":" + options.port + " proxying data " + message.utf8Data);

					var routeByConnectionSequence = null;
					var rpc = JSON.parse(message.utf8Data);
					var rpcid = rpc.id;
					var splid = (rpc.id != null ? (rpc.id.toString()).split(":") : []);
					// If routing information doesn't exist add the information and broadcast the message (rpc call or return value) to all the connections.
					if(splid.length == 1)
						rpc.id = rpc.id + ":" + this.connectionSequence;
					// If routing information exists remove the information and send the message (rpc call or return value) to a specific connection.
					else if(splid.length == 2)
					{
						rpc.id = parseInt(splid[0]);
						routeByConnectionSequence = (splid[1] == "null" ? null : parseInt(splid[1]));
					}

					var str = (options.proxyTo != null ? options.proxyTo.send(JSON.stringify(rpc), routeByConnectionSequence) : err_no_connection);

					// Return error only if rpc call is not a notification (notification: id = null)
					if(str != "")
					{
						logger.error(str);
						if(rpcid != null)
							this.send(JSON.stringify({"jsonrpc": "2.0", "error": {"code": "Spacelet", "message": str}, "id": rpcid}));
					}
				});

				connections[connectionSequence].on('close', function(reasonCode, description)
				{
					logger.info("WebSocketServer " + options.hostname + ":" + options.port + " close: " + reasonCode + ", " + description);

					delete connections[this.connectionSequence];
				});

				connections[connectionSequence].on('error', function(err)
				{
					logger.info("WebSocketServer " + options.hostname + ":" + options.port + " error: " + err);
				});
			}
			catch(err)
			{ return; }
		});
	}

	self.close = fibrous( function()
	{
		wsServer.shutDown();
		webServer.close();
		wsServer = null;
		webServer = null;	
		connections = {};

		logger.info("WebSocketServer " + options.hostname + ":" + options.port + " close called");
	});

	self.send = function(message, routeByConnectionSequence)
	{
		logger.info("WebSocketServer " + options.hostname + ":" + options.port + " sending message: " + message);

		for(var cs in connections)
		{
			if(connections[cs].connected && (routeByConnectionSequence == null || routeByConnectionSequence == connections[cs].connectionSequence))
				connections[cs].send(message);
		}

		return (typeof cs == "undefined" ? err_no_connection : "");					// return error if no connections
	}
}

module.exports = WebSocketServer;
