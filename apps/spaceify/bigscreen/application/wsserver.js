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
var connections = {};
var connectionSequence = 0;
var err_no_connection = "";
var webServer = null;

self.start = function(opts, callback)
	{
	options.hostname = opts.hostname || "";
	options.port = opts.port || "";
	options.proxyTo = opts.proxyTo || null;
	options.isBackend = opts.isBackend || false;

	err_no_connection = "WebSocketServer has no connection to the " + options.hostname + ":" + options.port;

	// Start http server  // // // // // // // // // // // // // // // // // // // // // // // // //
	webServer = http.createServer
		(
		function(request, response)
			{
			response.writeHead(200);
			response.end();
			}
		);
	webServer.listen(options.port, options.hostname, 511, function() { callback(null, true); });
	logger.info("WebSocketServer listening at " + options.hostname + ":" + options.port + "/" + "json-rpc");

	// Create the WebSocket server // // // // // // // // // // // // // // // // // // // // // //
	var WSServer = new websocket(
		{
		httpServer: webServer,
		autoAcceptConnections: false,

		keepalive: true,																// Keepalive connections and
		keepaliveInterval: 60000,														// ping them once a minute and
		dropConnectionOnKeepaliveTimeout: true,											// drop a connection if there's no answer
		keepaliveGracePeriod: 10000														// within the grace period.
		});

	// Connection requests   // // // // // // // // // // // // // // // // // // // // // // // //
	WSServer.on('request', function(request)
		{
		try {
			connectionSequence++;
			connections[connectionSequence] = request.accept("json-rpc", request.origin);
			connections[connectionSequence].connectionSequence = connectionSequence;
			logger.info("WebSocketServer accepted connection at " + options.hostname + ":" + options.port + "/" + "json-rpc");

			connections[connectionSequence].on('message', function(message)
				{
				var rpc = JSON.parse(message.utf8Data);
				if(rpc.method && rpc.method == "IsMaster")									// Query: Is this connection the master connection?
					{
					logger.info("WebSocketServer " + options.hostname + ":" + options.port + " received IsMaster query");
						
					var keys = Object.keys(connections);									// Object.keys returns a sorted array - lowest connectionSequence is the master
					this.send(JSON.stringify({"jsonrpc": "2.0", "result": (this.connectionSequence == keys[0] ? true : false), "id": rpc.id}));
					}
				else																		// Message: Proxy the message
					{
					logger.info("WebSocketServer " + options.hostname + ":" + options.port + " proxying data " + message.utf8Data);

					var str = (options.proxyTo != null ? options.proxyTo.send(message.utf8Data) : err_no_connection);
					if(str != "")															// Return error if other end of the proxyed channel is not connected
						{
						logger.error(str);
						if(rpc.id != null)
							this.send(JSON.stringify({"jsonrpc": "2.0", "error": {"code": "JSApp", "message": str}, "id": rpc.id}));
						}
					}
				});

			connections[connectionSequence].on('close', function(reasonCode, description)
				{
				logger.info("WebSocketServer " + options.hostname + ":" + options.port + " close: " + reasonCode + ", " + description);

				delete connections[this.connectionSequence];

				if(options.isBackend)
					{
					var keys = Object.keys(connections);
					// Next bigscreen must be set as the master if there are more connections left
					if(keys.length > 0)
						connections[keys[0]].send(JSON.stringify({"jsonrpc": "2.0", "method": "setMaster", "params": [true], "id": null}));
					// When all the bigscreens are closed send this message to the connected clients
					else if(keys.length == 0 && options.proxyTo)
						options.proxyTo.send(JSON.stringify({"jsonrpc": "2.0", "method": "close", "params": [false], "id": null}));
					}
				});

			connections[connectionSequence].on('error', function(err)
				{
				logger.info("WebSocketServer " + options.hostname + ":" + options.port + " error: " + err);
				});
			}
		catch(err)
			{
			return;
			}
		});
	}

self.close = fibrous( function()
	{
	logger.info("WebSocketServer::close() " + options.hostname + ":" + options.port);

	if(WSServer)
		{
		WSServer.shutDown();
		WSServer = null;
		}

	if(webServer)
		{
		webServer.close();
		webServer = null;
		}

	connections = {};
	});

self.send = function(message)
	{
	logger.info("WebSocketServer::close() " + options.hostname + ":" + options.port + " " + message);

	for(var cs in connections)												// messages are broadcasted to all the bigscreen connected to the backend
		{
		if(connections[cs].connected)
			connections[cs].send(message);
		}

	return (typeof cs == "undefined" ? err_no_connection : "");					// return error if no connections
	}

}

module.exports = WebSocketServer;
