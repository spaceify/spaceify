#!/usr/bin/env node
/**
 * WebSocketClient, 13.12.2013 Spaceify Inc.
 * 
 * @class WebSocketClient
 */

var fs = require("fs");
var fibrous = require("fibrous");
var wsClient = require("websocket").client;
var logger = require("./logger");
var Config = require("./config")();
var Utility = require("./utility");
var Language = require("./language");

function WebSocketClient()
{
var self = this;

var options = {};
var webSocket = null;
var connection = null;

self.connect = function(opts, callback)
	{
	options.hostname = opts.hostname || "";
	options.port = opts.port || "";
	options.is_secure = opts.is_secure || false;
	options.ca_crt = opts.ca_crt || Config.SPACEIFY_WWW_PATH + Config.SPACEIFY_CRT;
	options.owner = opts.owner || "-";
	options.protocol = (!options.is_secure ? "ws" : "wss");
	options.class = "WebSocketClient";

	logger.info(Utility.replace(Language.WEBSOCKET_CONNECTING, {":owner": options.owner, ":class": options.class, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port, ":subprotocol": "json-rpc"}));

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
			// message.utf8Data
			});
		});

	webSocket.connect(options.protocol + "://" + options.hostname + ":" + options.port + "/", "json-rpc");
	}

self.close = function()
	{
	if(webSocket != null)
		{
		logger.info(Utility.replace(Language.WEBSOCKET_CLOSING, {":owner": options.owner, ":class": options.class, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port, ":subprotocol": "json-rpc"}));

		webSocket = null;
		}
		
	if(connection != null)
		connection.close();
	connection = null;
	}

self.sendMessage = function(message)
	{
	logger.info(Utility.replace(Language.WEBSOCKET_SEND_MESSAGE, {":owner": options.owner, ":class": options.class, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port, ":subprotocol": "json-rpc", ":id": "-", ":message": message}));

	if(connection != null)
		connection.send(message);
	}

self.pipe = function(pipe, closeCallback, messageCallback)
	{
	connection.removeAllListeners("error");
	connection.removeAllListeners("close");
	connection.removeAllListeners("message");
	connection.on("error", function(err) { closeCallback(pipe.pipeId); });
	connection.on("close", function() { closeCallback(pipe.pipeId); });
	connection.on("message", function(message) { messageCallback(message.utf8Data, pipe.connectionId); });
	}

}

module.exports = WebSocketClient;
