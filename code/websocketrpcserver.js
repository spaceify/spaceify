#!/usr/bin/env node
/**
 * WebSocketRPCServer, 18.9.2013 Spaceify Inc.
 */

// INCLUDES
var fs = require("fs");
var http = require("http");
var https = require("https");
var fibrous = require("fibrous");
var WebSocketServer = require("websocket").server;
var logger = require("./logger");
var Const = require("./constants");
var Config = require("./config")();
var Utility = require("./utility");
var Language = require("./language");

/** 
 * @class WebSocketRPCServer
 */

function WebSocketRPCServer()
{
var self = this;

var options = {};
var wsServer = null;
var webServer = null;
var connectionSequence = 0;
var connections = new Object();		// We can handle multiple incoming connections
var rpcMethods = new Object();
var callbacks = new Object();
var callSequence = 1;

self.connect = function(opts, callback)
	{
	options.hostname = opts.hostname || "";
	options.port = opts.port || "";
	options.is_secure = opts.is_secure || false;
	options.key = opts.key || Config.SPACEIFY_TLS_PATH + Const.SERVER_KEY;
	options.crt = opts.crt || Config.SPACEIFY_TLS_PATH + Const.SERVER_CRT;
	options.ca_crt = opts.ca_crt || Config.SPACEIFY_WWW_PATH + Const.SPACEIFY_CRT;
	options.owner = opts.owner || "-";
	options.connectionListener = opts.connectionListener || null;
	options.unknownMethodListener = opts.unknownMethodListener || null;
	options.protocol = (!options.is_secure ? "ws" : "wss");
	options.class = "WebSocketRPCServer";

	logger.info(Utility.replace(Language.WEBSOCKET_CONNECTING, {":owner": options.owner, ":class": options.class, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port, ":subprotocol": "json-rpc"}));

	if(!options.is_secure)												// Start a http server
		{
		webServer = http.createServer( function(request, response)
			{
			response.writeHead(501);
			response.end("Not implemented");
			});
		}
	else																// Start a https server
		{
		var key = fs.sync.readFile(options.key);
		var crt = fs.sync.readFile(options.crt);
		var ca_crt = fs.sync.readFile(options.ca_crt, "utf8");

		webServer = https.createServer({ key: key, cert: crt, ca: ca_crt }, function(request, response)
			{
			response.writeHead(501);
			response.end("Not implemented");
			});
		}

	webServer.listen(options.port, options.hostname, 511, function()
		{
		callback(null, true);
		});

	webServer.on("error", function(err)
		{
		callback(err, null);
		});

	// Create the WebSocket server
	wsServer = new WebSocketServer(
		{
		httpServer: webServer,
		autoAcceptConnections: false,

		keepalive: true,																	// Keepalive connections and
		keepaliveInterval: 60000,															// ping them once a minute and
		dropConnectionOnKeepaliveTimeout: true,												// drop a connection if there's no answer
		keepaliveGracePeriod: 10000															// within the grace period.
		});

	// Connection request
	wsServer.on('request', function(request)
		{
		// Open connection - Should the request.origin be checked somehow?{ request.reject(404, <message>); throw ""; }?
		try
			{
			connectionSequence++;															// Use this enumeration as the connection id
			connections[connectionSequence] = request.accept("json-rpc", request.origin);
			connections[connectionSequence].id = connectionSequence;
			connections[connectionSequence].remoteAddress = request.remoteAddress;
			connections[connectionSequence].remotePort = request.remotePort;
			connections[connectionSequence].origin = request.origin;
			connections[connectionSequence].is_secure = options.is_secure;

			connections[connectionSequence].on("message", function(message) { onMessage(message, this); });	// "this" points to the connection now!
			connections[connectionSequence].on("close", function(reasonCode, description) { self.closeConnection(this); });
			//connections[connectionSequence].on("error", function(error) { self.closeConnection(this); });

			if(typeof options.connectionListener == "function")								// External connection listener
				options.connectionListener("open", options.owner, connections[connectionSequence]);

			logger.info(Utility.replace(Language.WEBSOCKET_CONNECTION_REQUEST, {":owner": options.owner, ":class": options.class, ":origin": request.origin, ":protocol": options.protocol, ":address": request.remoteAddress, ":port": request.remotePort, ":id": connectionSequence}));
			}
		catch(err)
			{
			return;
			}
		});

wsServer.on("connect", function(request, socket, head)
		{
		});

wsServer.on("upgrade", function(request, socket, head)
		{
		});
		
wsServer.on("clientError", function(exception, socket)
		{
		});

	// Connection closed
	wsServer.on("close", function(webSocketConnection, closeReason, description)
		{
		});
	}

self.close = fibrous( function()
	{
	if(wsServer)
		{
		logger.info(Utility.replace(Language.WEBSOCKET_CLOSING, {":owner": options.owner, ":class": options.class, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port, ":subprotocol": "json-rpc"}));

		wsServer.shutDown();
		wsServer = null;
		}

	if(webServer)
		{
		logger.info(Utility.replace(Language.WEBSOCKET_CLOSING_WEB, {":owner": options.owner, ":class": options.class, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port}));

		webServer.close();
		webServer = null;
		}

	rpcMethods = new Object();
	callbacks = new Object();
	});

self.closeConnection = function(connection)
	{
	if(typeof connection !== "object")
		connection = connections[connection];

	if(connection.id in connections)
		{
		logger.info(Utility.replace(Language.WEBSOCKET_CLOSE_CONNECTION, {":owner": options.owner, ":class": options.class, ":origin": connection.origin, ":protocol": options.protocol, ":hostname": connection.remoteAddress, ":port": connection.remotePort, ":subprotocol": "json-rpc", ":id": connection.id}));

		if(typeof options.connectionListener == "function")								// External connection listener
			options.connectionListener("close", options.owner, connection);

		connection.close();
		delete connections[connection.id];
		}
	}

self.exposeMethod = function(name, object_, method_)
	{
	rpcMethods[name] = {object: object_, method: method_};
	}

self.call = function(methods, params, object, id, listener)
	{
	var callObject;
	var callObjects = [];
	var isBatch = false;

	if(!(id in connections))
		return;

	if(!(methods instanceof Array))
		{
		methods = [methods];
		params = [params];
		}
	else
		isBatch = true;

	for(var i=0; i<methods.length; i++)
	{
		if(typeof listener == "function")											// call: expects a response object
		{
			callObject = {"jsonrpc": "2.0", "method": methods[i], "params": params[i], "id": callSequence};
			callbacks[callSequence] = {"object": object, "listener": listener};
			callSequence++;
		}
		else																		// notification: doesn't expect a response object
			callObject = {"jsonrpc": "2.0", "method": methods[i], "params": params[i], "id": null};

		callObjects.push(callObject);
	}

	self.sendMessage(isBatch ? callObjects : callObjects[0], id);
	}

self.sendMessage = function(message, connection)
	{
	logger.info(Utility.replace(Language.WEBSOCKET_SEND_MESSAGE, {":owner": options.owner, ":class": options.class, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port, ":subprotocol": "json-rpc", ":id": connection.id, ":message": JSON.stringify(message)}));

	if(typeof connection !== "object")
		connection = connections[connection];
	connection.send(JSON.stringify(message));
	}

// JSONRPC 2.0 format messages. Supports single, batch and notification requests.
var onMessage = function(message, connection)
	{
	logger.info(Utility.replace(Language.WEBSOCKET_ON_MESSAGE, {":owner": options.owner, ":class": options.class, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port, ":subprotocol": "json-rpc", ":id": connection.id, ":message": message.utf8Data}));

	fibrous.run(function()
		{

		var reqa;
		var rspa = [];
		var isBatch = false;
		var connobj = connection;

		if(!(reqa = Utility.parseJSON(message.utf8Data, false)))
			{
			self.sendMessage({"jsonrpc": "2.0", "error": {"code": -32700, "message": "Invalid JSON."}, "id": null}, connection);
			return;
			}

		if(!(reqa instanceof Array))
			reqa = [reqa];
		else
			isBatch = true;

		// ...............................................................................................
		if(reqa[0].method) // .............................................. Received an external RPC Call
			{
			for(var r = 0; r < reqa.length; r++)
				{
				connobj.rpcId = reqa[r].id;

				if(!reqa[r].jsonrpc || reqa[r].jsonrpc != "2.0" || !reqa[r].method)				// Invalid JSON-RPC
					{
					rspa.push({"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid JSON-RPC."}, "id": null});
					continue;
					}

				if(!rpcMethods.hasOwnProperty(reqa[r].method))									// Unknown method
					{
					if(options.unknownMethodListener)												// Owner wants to catch the unknown methods
						options.unknownMethodListener(reqa[r], connobj);
					else if(reqa[r].id != null)														// Return error to caller
						rspa.push({"jsonrpc": "2.0", "error": {"code": -32601, "message": "Method " + reqa[r].method + " not found."}, "id": reqa[r].id});
					continue;
					}

				try	{																			// Call the method rpcMethod[0] of object rpcMethod[0]
					var rpcMethod = rpcMethods[reqa[r].method];
					reqa[r].params.push(connobj);
					var result = rpcMethod.method.sync.apply(rpcMethod.object, reqa[r].params);

					if(reqa[r].id != null)
						rspa.push({"jsonrpc": "2.0", "result": result, "id": reqa[r].id});
					}
				catch(err)
					{
					Utility.printErrors(err);

					if(reqa[r].id != null)
						rspa.push({"jsonrpc": "2.0", "error": err, "id": reqa[r].id});
					}
				}

			if(isBatch && rspa.length > 0)
				self.sendMessage(rspa, connection);
			else if(!isBatch && rspa.length > 0)
				self.sendMessage(rspa[0], connection);
			}
		// ...................................................................................................
		else // ............................................................ Returns from an internal RPC call
			{
			var calledOnce = false;

			for(r in reqa)
				{
				if(!reqa[r].id || !callbacks[reqa[r].id])
					continue;

				connobj.rpcId = reqa[r].id;

				if(isBatch)																		// Batch request gets called only once with all the responses in a response array!!! Let caller process the array.
					{
					if(!calledOnce) {
						callbacks[reqa[r].id].listener.apply(callbacks[reqa[r].id].object, [null, reqa, connobj]); calledOnce = true; }
					}
				else																			// Single request gets always called only once!!!
					{
					if(typeof reqa[r].result != "undefined")
						callbacks[reqa[r].id].listener.apply(callbacks[reqa[r].id].object, [null, reqa[r].result, connobj]);
					else if(typeof reqa[r].error != "undefined")
						callbacks[reqa[r].id].listener.apply(callbacks[reqa[r].id].object, [reqa[r].error, null, connobj]);
					else if(!calledOnce)
						callbacks[reqa[r].id].listener.apply(callbacks[reqa[r].id].object, [null, null, connobj]);
					}

				delete callbacks[reqa[r].id];
				}
			}

		});
	}

self.processBatchCall = function(data)
	{ // Process raw JSON-RPC objects returned by batch JSON-RPC call. Returns an array containing [{err: .., data: ...}, {err: ..., data: ....}, ...] objects.
	var result = [];
	for(var i=0; i<data.length; i++)
		{
		if(data[i].error)
			result.push({error: data[i].error, result: null});
		else	// result
			result.push({error: null, result: data[i].result});
		}

	return result;
	}

}

module.exports = WebSocketRPCServer;
