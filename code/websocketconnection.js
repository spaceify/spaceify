#!/usr/bin/env node
/**
 * WebSocketConnection, 13.12.2013 Spaceify Inc.
 * 
 * @class WebSocketConnection
 */

var fs = require("fs");
var fibrous = require("fibrous");
var wsClient = require("websocket").client;
var logger = require("./www/libs/logger");
var config = require("./config")();
var utility = require("./utility");
var language = require("./language");

function WebSocketConnection()
{
var self = this;

var options = {};
var webSocket = null;
var connection = null;

var binaryListener = null;
var messageListener = null;
var connectionListener = null;
var disconnectionListener = null;

self.connect = function(opts, callback)
	{
	options.hostname = opts.hostname || "";
	options.port = opts.port || "";
	options.is_secure = opts.is_secure || false;
	options.ca_crt = opts.ca_crt || config.SPACEIFY_WWW_PATH + config.SPACEIFY_CRT;
	options.owner = opts.owner || "-";
	options.subprotocol = opts.subprotocol || config.WS_JSON_RPC;
	options.protocol = (!options.is_secure ? "ws" : "wss");
	options.class = "WSC";

	options.debug = opts.debug || true;
	logger.setOptions({write_to_console: options.debug});

	logger.info(utility.replace(language.WEBSOCKET_CONNECTING, {":owner": options.owner, ":class": options.class, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port, ":subprotocol": options.subprotocol}));

	var wso = (options.is_secure ? { tlsOptions: { ca: [fs.sync.readFile(options.ca_crt, "utf8")] } } : {});
	webSocket = new wsClient(wso);

	webSocket.on("connectFailed", function(err)
		{
		callback(err, null);
		});

	webSocket.on("connect", function(connected)
		{
		connection = connected;
		callback(null, true);

		if(connectionListener)
			connectionListener(connection);

		connection.on("error", function(err)
			{
			if(disconnectionListener)
				disconnectionListener(connection);

			webSocket = null;
			connection = null;
			});

		connection.on("close", function()
			{
			logger.info(utility.replace(language.WEBSOCKET_CLOSE_CONNECTION, {":owner": options.owner, ":class": options.class, ":origin": "-", ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port, ":subprotocol": options.subprotocol, ":id": "-"}));

			if(disconnectionListener)
				disconnectionListener(connection);

			webSocket = null;
			connection = null;
			});

		connection.on("message", function(message)
			{
			onMessage(message);
			});
		});

	webSocket.connect(options.protocol + "://" + options.hostname + ":" + options.port + "/", options.subprotocol);
	}

self.close = function()
	{
	binaryListener = null;
	messageListener = null;
	connectionListener = null;
	disconnectionListener = null;

	if(webSocket != null)
		{
		logger.info(utility.replace(language.WEBSOCKET_CLOSING, {":owner": options.owner, ":class": options.class, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port, ":subprotocol": options.subprotocol}));

		webSocket = null;
		}

	if(connection != null)
		connection.close();
	connection = null;
	}

self.sendMessage = function(message)
	{ // String or bytes
	try {
		logger.info(utility.replace(language.WEBSOCKET_SEND_MESSAGE, {":owner": options.owner, ":class": options.class, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port, ":subprotocol": options.subprotocol, ":id": "-", ":message": message}));

		typeof message === "string" ? connection.sendUTF(message) : connection.sendBytes(message);
		}
	catch(err)
		{}
	}

self.sendBinary = function(buffer, connection)
	{ // Buffer
	try {
		buffer = utility.toBuffer(buffer);

		logger.info(utility.replace(language.WEBSOCKET_SEND_BINARY, {":owner": options.owner, ":class": options.class, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port, ":subprotocol": options.subprotocol, ":id": connection.id, ":length": buffer.length}));

		connection.send(buffer);
		}
	catch(err)
		{}
	}

var onMessage = function(message)
	{
	if(messageListener)
		message.type === "utf8" ? messageListener(message.utf8Data) : messageListener(message.binaryData);
	}

self.isOpen = function()
	{
	return connection ? true : false;
	}

self.setConnectionListener = function(listener)
	{
	connectionListener = (typeof listener == "function" ? listener : null);
	}

self.setDisconnectionListener = function(listener)
	{
	disconnectionListener = (typeof listener == "function" ? listener : null);
	}

self.setMessageListener = function(listener)
	{
	messageListener = (typeof listener == "function" ? listener : null);
	}

self.setBinaryListener = function(listener)
	{
	binaryListener = (typeof listener == "function" ? listener : null);
	}

self.onBinary = function(buffer)
	{ // Either a Buffer or an ArrayBuffer, listener must check this
	if(binaryListener)
		binaryListener(buffer);
	}

	// PIPE SERVER/SETUP CONNECTION -- -- -- -- -- -- -- -- -- -- //
self.pipe = function(pipe, _disconnectFrom, _sendMessage)
	{
	// This "breaks" the message path of the connection and pipes the incoming messages to a new path.
	connection.removeAllListeners("error");
	connection.removeAllListeners("close");
	connection.removeAllListeners("message");

	connection.on("error", function(err)
		{
		_disconnectFrom(pipe.pipe_id);
		});

	connection.on("close", function()
		{
		_disconnectFrom(pipe.pipe_id);
		});

	connection.on("message", function(message)
		{
		message = (message.utf8Data ? message.utf8Data : message);
		_sendMessage(message, pipe.connection_id);
		});
	}

}

module.exports = WebSocketConnection;
