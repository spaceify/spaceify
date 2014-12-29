#!/usr/bin/env node
/**
 * WebSocketRPCClient, 18.10.2013 Spaceify Inc.
 * 
 * RPC CLIENT - This is a JSON-PRC 2.0 compliant client
 * 
 * @class WebSocketRPCClient
 */

var fibrous = require("fibrous");
var WebSocketClient = require("websocket").client;
var logger = require("./logger");
var Utility = require("./utility");
var Language = require("./language");

function WebSocketRPCClient()
{
var self = this;

var options = {};
var webSocket = null;
var connection = null;
var callSequence = 1;
var callbacks = new Object();

self.connect = function(opts, callback)
	{
	options.hostname = opts.hostname || "";
	options.port = opts.port || "";
	options.isSsl = opts.isSsl || false;
	options.persistent = opts.persistent || false;						// Reduce overhead by keeping connection open between calls
	options.owner = opts.owner || "-";
	options.protocol = (!options.isSsl ? "ws" : "wss");
	options.class = "WebSocketRPCClient";

	logger.info(Utility.replace(Language.WEBSOCKET_CONNECTING, {":owner": options.owner, ":class": options.class, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port, ":subprotocol": "json-rpc"}));

	webSocket = new WebSocketClient();

	webSocket.on("connectFailed", function(err)
		{
		callback(err, null);
		});

	webSocket.on("connect", function(connected)
		{
		connection = connected;
		callback(null, true);

		connection.on("error", function(err)
			{
			webSocket = null;
			connection = null;
			});

		connection.on("close", function()
			{
			logger.info(Utility.replace(Language.WEBSOCKET_CLOSE_CONNECTION, {":owner": options.owner, ":class": options.class, ":origin": "-", ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port, ":subprotocol": "json-rpc", ":id": "-"}));
			webSocket = null;
			connection = null;
			});

		connection.on("message", function(message)
			{
			onMessage(message);
			});
		});

	webSocket.connect(options.protocol + "://" + options.hostname + ":" + options.port + "/", "json-rpc");
	}

self.close = function()
	{
	if(connection != null)
		connection.close();
	connection = null;
	}

self.call = function(methods, params, object, listener)
	{
	if(connection == null)
		listener(new Error(Language.NO_CONNECTION_TO_SERVER), null);

	var callObject;
	var callObjects = [];
	var isBatch = false;

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

	sendMessage(isBatch ? callObjects : callObjects[0]);
	}

var sendMessage = function(message)
	{
	logger.info(Utility.replace(Language.WEBSOCKET_SEND_MESSAGE, {":owner": options.owner, ":class": options.class, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port, ":subprotocol": "json-rpc", ":id": "-", ":message": JSON.stringify(message)}));

	if(connection != null)
		connection.send(JSON.stringify(message));
	}

var onMessage = function(message)
	{
	logger.info(Utility.replace(Language.WEBSOCKET_ON_MESSAGE, {":owner": options.owner, ":class": options.class, ":protocol": options.protocol, ":hostnmame": options.hostname, ":port": options.port, ":subprotocol": "json-rpc", ":id": "-", ":message": message.utf8Data}));

	var reqa;
	var rspa = [];
	var isBatch = false;
	var calledOnce = false;

	if(!(reqa = Utility.parseJSON(message.utf8Data, false)))
		{
		sendMessage({"jsonrpc": "2.0", "error": {"code": -32700, "message": "Invalid JSON."}, "id": null});
		return;
		}

	if(!(reqa instanceof Array))
		reqa = [reqa];
	else
		isBatch = true;

	for(var r = 0; r < reqa.length; r++)
		{
		if(!reqa[r].id || !callbacks[reqa[r].id])
			continue;

		if(isBatch)																	// Batch request gets called only once with all the responses in a response array!!! Let the caller process the array.
			{
			if(!calledOnce) {
				callbacks[reqa[r].id].listener.apply(callbacks[reqa[r].id].object, [null, reqa, reqa[r].id]); calledOnce = true; }
			}
		else																		// Single request gets always called only once!!!
			{
			if(typeof reqa[r].result != "undefined")
				callbacks[reqa[r].id].listener.apply(callbacks[reqa[r].id].object, [null, reqa[r].result, reqa[r].id]);
			else if(typeof reqa[r].error != "undefined")
				callbacks[reqa[r].id].listener.apply(callbacks[reqa[r].id].object, [reqa[r].error, null, reqa[r].id]);
			else if(!calledOnce)
				callbacks[reqa[r].id].listener.apply(callbacks[reqa[r].id].object, [null, null, reqa[r].id]);
			}

		delete callbacks[reqa[r].id];
		}

	if(!options.persistent)
		{
		connection.close();
		webSocket = null;
		}
	}
}

module.exports = WebSocketRPCClient;
