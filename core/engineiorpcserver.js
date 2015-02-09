#!/usr/bin/env node
/**
 * engine.io connection, 16.12.2013 Spaceify Inc.
 * 
 * @class EngineIoRPCServer
 */

// client side script location: node_modules/socket.io/node_modules/socket.io-client/dist/socket.io.js

// INCLUDES
var fs = require("fs");
var url = require("url");
var http = require("http");
var https = require("https");
var fibrous = require("fibrous");
var engineio = require("engine.io");
var logger = require("./logger");
var Utility = require("./utility");
var Language = require("./language");

function EngineIoRPCServer()
{
var self = this;

var options = {};
var eiServer = null;
var webServer = null;
var connectionSequence = 0;
var connections = new Object();		// We can handle multiple incoming connections
var rpcMethods = new Object();
var callbacks = new Object();

// Public upwards interface
self.connect = function(opts, callback)
	{
	options.hostname = opts.hostname || "";
	options.port = opts.port || "";
	options.isSsl = opts.isSsl || false;
	options.sslKey = opts.sslKey || "";
	options.sslCert = opts.sslCert || "";
	options.owner = opts.owner || "-";
	options.connectionListener = opts.connectionListener || null;
	options.unknMethodListener = opts.unknMethodListener || null;
	options.protocol = (!options.isSsl ? "ws" : "wss");
	options.class = "EngineIoRPCServer";

	logger.info(Utility.replace(Language.ENGINE_IO_CONNECTING, {":owner": options.owner, ":class": options.class, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port}));

	if(!options.isSsl)													// Start a http server
		{
		webServer = http.createServer( function(request, response)
			{
console.log("Hello non ssl");
			response.writeHead(501);
			response.end("Not implemented");
			});
		}
	else																// Start a https server
		{
		webServer = https.createServer({ key: options.sslKey, cert: options.sslCert, secureProtocol: "SSLv3_method" }, function(request, response)
			{
console.log("Hello ssl");
			response.writeHead(501);
			response.end("Not implemented");
			});
		}

	webServer.listen(options.port, options.hostname, 511, function()
		{
console.log("i'm listening " + options.port);
		callback(null, true);
		});

	webServer.on("error", function(err)
		{
console.log("i'm not listening " + options.port);
		callback(err, null);
		});

	// Create the engine.io server
	eiServer = engineio.attach(webServer);

	eiServer.on("connection", function(socket)
		{
		var purl = url.parse(socket.request.headers.host, true);
		var remoteAddress = socket.request.connection.remoteAddress;
		var remotePort = socket.request.connection.remotePort;
		var origin = purl.hostname;

		// checkAccess(remoteAddress, remotePort, origin);

		connectionSequence++;															// Use this enumeration as the connection id
		connections[connectionSequence] = socket;
		connections[connectionSequence].id = connectionSequence;
		connections[connectionSequence].remoteAddress = remoteAddress;
		connections[connectionSequence].remotePort = remotePort;
		connections[connectionSequence].origin = origin;

		socket.on("message", function(message) { onMessage(message, this); });
		socket.once("close", function() { self.closeConnection(this); });
		socket.on("error", function(err) { });

		if(typeof options.connectionListener == "function")								// External connection listener
			options.connectionListener("open", {remoteAddress: remoteAddress, remotePort: remotePort, origin: origin, id: connectionSequence});

		logger.info(Utility.replace(Language.ENGINE_IO_CONNECTION_REQUEST, {":owner": options.owner, ":class": options.class, ":origin": origin, ":protocol": options.protocol, ":address": remoteAddress, ":port": remotePort, ":id": connectionSequence}));
		});
	}

self.close = fibrous( function()
	{ // close the engine.io server
	if(eiServer)
		{
		logger.info(Utility.replace(Language.ENGINE_IO_CLOSING, {":owner": options.owner, ":class": options.class, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port}));

		eiServer.close();																// Closes all clients
		eiServer = null;
		}

	if(webServer)
		{
		logger.info(Utility.replace(Language.ENGINE_IO_CLOSING_WEB, {":owner": options.owner, ":class": options.class, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port}));

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
		logger.info(Utility.replace(Language.ENGINE_IO_CLOSE_CONNECTION, {":owner": options.owner, ":class": options.class, ":origin": connection.origin, ":protocol": options.protocol, ":address": connection.remoteAddress, ":port": connection.remotePort, ":id": connection.id}));

		connection.close();
		delete connections[connection.id];

		if(typeof options.connectionListener == "function")									// External connection listener
			options.connectionListener("close", {remoteAddress: connection.remoteAddress, remotePort: connection.remotePort, origin: connection.origin, id: connection.id});
		}
	}

self.exposeRPCMethod = function(name, object_, method_)
	{
	rpcMethods[name] = {object: object_, method: method_};
	}

self.call = function(methods, params, object, listener, id)
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

	sendMessage(isBatch ? callObjects : callObjects[0], id);
	}

self.sendMessage = function(message, connection)
	{
	logger.info(Utility.replace(Language.ENGINE_IO_SEND_MESSAGE, {":owner": options.owner, ":class": options.class, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port, ":id": connection.id, ":message": JSON.stringify(message)}));

	if(typeof connection !== "object")
		connection = connections[connection];
	if(connection.readyState == "open")
		connection.send(JSON.stringify(message));
	}

self.sendStringMessage = function(message, connection)
	{
	logger.info(Utility.replace(Language.ENGINE_IO_SEND_STRING_MESSAGE, {":owner": options.owner, ":class": options.class, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port, ":id": connection.id, ":message": message}));

	if(typeof connection !== "object")
		connection = connections[connection];
	if(connection.readyState == "open")
		connection.send(message);
	}

// JSONRPC 2.0 format messages. Supports single, batch and notification requests.
var onMessage = function(message, connection)
	{
	logger.info(Utility.replace(Language.ENGINE_IO_ON_MESSAGE, {":owner": options.owner, ":class": options.class, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port, ":id": connection.id, ":message": message}));

	fibrous.run(function()
		{

		var reqa;
		var rspa = [];
		var isBatch = false;
		var connobj = {remoteAddress: connection.remoteAddress, remotePort: connection.remotePort, origin: connection.origin, id: connection.id};

		if(!(reqa = Utility.parseJSON(message, false)))
			{
			self.sendMessage({"jsonrpc": "2.0", "error": {"code": -32700, "message": "Invalid JSON."}, "id": null}, connection);
			return;
			}

		if(!(reqa instanceof Array))
			reqa = [reqa];
		else
			isBatch = true;

		// ..............................................................................................
		if(reqa[0].method) // ..............................................Received an external RPC Call
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
					if(options.unknMethodListener)													// Owner wants to catch the unknown methods
						options.unknMethodListener(reqa[r], connobj);
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
		// ..................................................................................................
		else // ............................................................Returns from an internal RPC call
			{
			var calledOnce = false;

			for(r in reqa)
				{
				if(!reqa[r].id || !callbacks[reqa[r].id])
					continue;

				connobj.rpcId = reqa[r].id;

				if(isBatch)																		// Batch request gets called only once with all the responses in a response array!!! Let the caller process the array.
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

var checkAccess = function(remoteAddress, remotePort, origin)
	{
	return true;
	}

self.pipe = function(pipe, closeCallback, messageCallback)
	{
	var connection = connections[pipe.connectionId];
	connection.removeAllListeners("close");
	connection.removeAllListeners("message");
	connection.once("close", function() { closeCallback(pipe.pipeId); });
	connection.on("message", function(message, cb) { messageCallback(message); });
	}

}

module.exports = EngineIoRPCServer;
