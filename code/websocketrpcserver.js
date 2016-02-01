#!/usr/bin/env node
/**
 * WebSocket server, 18.9.2013 Spaceify Inc.
 *
 * This is a JSON-RPC 2.0 compliant server supporting single, batch and notification requests.
 *
 * @class WebSocketRPCServer
 */

// INCLUDES
var fs = require("fs");
var http = require("http");
var https = require("https");
var WebSocketServer = require("websocket").server;
var crypt = require("./crypt");
var logger = require("./logger");
var config = require("./config")();
var utility = require("./utility");
var language = require("./language");
var RPC = require("./www/libs/handlers/rpc");

function WebSocketRPCServer()
{
var self = this;

var options = {};
var wsServer = null;
var webServer = null;
var connections = {};
var callSequence = 1;
var _class = "WSRPCS";

var binaryListener = null;
var accessListener = null;
var serverUpListener = null;
var serverDownListener = null;
var connectionListener = null;
var disconnectionListener = null;
var unknownMethodListener = null;

utility.extendClass(new RPC(self), self);								// Make methods from the handler class available to this class

self.connect = function(opts, callback)
	{
	options.hostname = opts.hostname || "";
	options.port = opts.port || "";
	options.is_secure = opts.is_secure || false;
	options.key = opts.key || config.SPACEIFY_TLS_PATH + config.SERVER_KEY;
	options.crt = opts.crt || config.SPACEIFY_TLS_PATH + config.SERVER_CRT;
	options.ca_crt = opts.ca_crt || config.SPACEIFY_WWW_PATH + config.SPACEIFY_CRT;
	options.owner = opts.owner || "-";
	options.subprotocol = opts.subprotocol || config.WS_JSON_RPC;
	options.protocol = (!options.is_secure ? "ws" : "wss");
	options.server_type = opts.server_type || (!options.is_secure ? config.WEBSOCKET_RPC_SERVER : config.WEBSOCKET_RPC_SERVER_SECURE);
	options.user_object = opts.user_object || null;

	logger.info(utility.replace(language.WEBSOCKET_OPENING, {":owner": options.owner, ":class": _class, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port, ":subprotocol": options.subprotocol}));

		// CREATE THE WEB SERVER -- -- -- -- -- -- -- -- -- -- //
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
		if(serverUpListener)
			serverUpListener(utility.createServerObject({server_type: options.server_type, is_secure: options.is_secure}, options.user_object));

		callback(null, true);
		});

	webServer.on("error", function(err)
		{
		if(serverDownListener)
			serverDownListener(utility.createServerObject({server_type: options.server_type, is_secure: options.is_secure}, options.user_object));

		callback(err, null);
		});

	webServer.on("close", function()
		{
		if(serverDownListener)
			serverDownListener(utility.createServerObject({server_type: options.server_type, is_secure: options.is_secure}, options.user_object));
		});

		// CREATE THE WEBSOCKET SERVER -- -- -- -- -- -- -- -- -- -- //
	wsServer = new WebSocketServer(
		{
		httpServer: webServer,
		autoAcceptConnections: false,

		keepalive: true,																	// Keepalive connections and
		keepaliveInterval: 60000,															// ping them once a minute and
		dropConnectionOnKeepaliveTimeout: true,												// drop a connection if there's no answer
		keepaliveGracePeriod: 10000															// within the grace period.
		});

	wsServer.on("request", function(request)
		{
		var origin = request.origin;
		var remotePort = request.remotePort;
		var remoteAddress = request.remoteAddress;

		logger.info(utility.replace(language.WEBSOCKET_CONNECTION_REQUEST, {":owner": options.owner, ":class": _class, ":origin": request.origin, ":protocol": options.protocol, ":address": remoteAddress, ":port": remotePort}));

		var access = checkAccess(remoteAddress, remotePort, origin, request.requestedProtocols);
		if(!access.granted)
			request.reject(403, access.message);
		else
			{
			var cid = utility.generateRandomConnectionId(connections);
			connections[cid] = request.accept(options.subprotocol, origin);
			connections[cid].origin = origin;
			connections[cid].id = cid;
			connections[cid].server_type = options.server_type;
			connections[cid].remotePort = remotePort;
			connections[cid].remoteAddress = remoteAddress;
			connections[cid].is_secure = options.is_secure;

			connections[cid].on("message", function(message) { self.onMessage(message, this); });
			connections[cid].on("close", function(reasonCode, description) { self.closeConnection(this); });
			//connections[cid].on("error", function(error) { self.closeConnection(this); });

			if(connectionListener)
				connectionListener(utility.createServerObject(
									{
									origin: connections[cid].origin,
									id: connections[cid].id,
									server_type: connections[cid].server_type,
									remotePort: connections[cid].remotePort,
									remoteAddress: connections[cid].remoteAddress,
									is_secure: connections[cid].is_secure
									}, options.user_object));
			}
		});

	wsServer.on("connect", function(request, socket, head)
		{
		});

	wsServer.on("close", function(webSocketConnection, closeReason, description)
		{
		});
	}

var checkAccess = function(remoteAddress, remotePort, origin, requestedProtocols)
	{
	var granted = {message: "", granted: true};

	if(accessListener)
		granted = accessListener(remoteAddress, remotePort, origin, options.server_type, options.is_secure, requestedProtocols);

	return granted;
	}

self.close = function()
	{
	binaryListener = null;
	accessListener = null;
	serverUpListener = null;
	serverDownListener = null;
	connectionListener = null;
	disconnectionListener = null;
	unknownMethodListener = null;

	if(wsServer)
		{
		logger.info(utility.replace(language.WEBSOCKET_CLOSING, {":owner": options.owner, ":class": _class, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port, ":subprotocol": options.subprotocol}));

		wsServer.shutDown();
		wsServer = null;
		}

	if(webServer)
		{
		logger.info(utility.replace(language.WEBSOCKET_CLOSING_WEB, {":owner": options.owner, ":class": _class, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port}));

		webServer.close();
		webServer = null;
		}

	connections = {};
	}

self.closeConnection = function(connection)
	{
	if(typeof connection !== "object")
		connection = connections[connection];

	if(connection.id in connections)
		{
		logger.info(utility.replace(language.WEBSOCKET_CLOSE_CONNECTION, {":owner": options.owner, ":class": _class, ":origin": connection.origin, ":protocol": options.protocol, ":hostname": connection.remoteAddress, ":port": connection.remotePort, ":subprotocol": options.subprotocol, ":id": connection.id}));

		if(disconnectionListener)
			disconnectionListener(utility.createServerObject(
									{
									origin: connection.origin,
									id: connection.id,
									server_type: connection.server_type,
									remotePort: connection.remotePort,
									remoteAddress: connection.remoteAddress,
									is_secure: connection.is_secure
									}, options.user_object));

		connection.close();
		delete connections[connection.id];
		}
	}

self.sendMessage = function(message, connection)
	{ // String
	try {
		if(typeof connection !== "object")
			connection = connections[connection];

		message = (typeof message == "string" ? message : JSON.stringify(message));

		logger.info(utility.replace(language.WEBSOCKET_SEND_MESSAGE, {":owner": options.owner, ":class": _class, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port, ":subprotocol": options.subprotocol, ":id": connection.id, ":message": message}));

		connection.send(message);
		}
	catch(err)
		{}
	}

self.sendBinary = function(buffer, connection)
	{ // Buffer
	try {
		if(typeof connection !== "object")												// connection = connection id or connection object
			connection = connections[connection];

		buffer = utility.toBuffer(buffer);

		logger.info(utility.replace(language.WEBSOCKET_SEND_BINARY, {":owner": options.owner, ":class": options.class, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port, ":subprotocol": options.subprotocol, ":id": connection.id, ":length": buffer.length}));

		connection.send(buffer);
		}
	catch(err)
		{}
	}

self.notifyAll = function(method, params)
	{
	try {
		logger.info(utility.replace(language.WEBSOCKET_NOTIFY_ALL, {":owner": options.owner, ":class": _class, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port, ":subprotocol": options.subprotocol}));

		for(var key in connections)
			self.sendMessage({jsonrpc: "2.0", method: method, params: params, id: null}, key);
		}
	catch(err)
		{}
	}

self.isOpen = function()
	{
	return (webServer && wsServer == "open" ? true : false);
	}

self.isConnection = function(connection)
	{
	return connection in connections;
	}

self.isPersistent = function()
	{
	return options.persistent;
	}

self.setServerUpListener = function(listener)
	{
	serverUpListener = (typeof listener == "function" ? listener : null);
	}

self.setServerDownListener = function(listener)
	{
	serverDownListener = (typeof listener == "function" ? listener : null);
	}

self.setConnectionListener = function(listener)
	{
	connectionListener = (typeof listener == "function" ? listener : null);
	}

self.setDisconnectionListener = function(listener)
	{
	disconnectionListener = (typeof listener == "function" ? listener : null);
	}

self.setUnknownMethodListener = function(listener)
	{
	unknownMethodListener = (typeof listener == "function" ? listener : null);
	}

self.setAccessListener = function(listener)
	{
	accessListener = (typeof listener == "function" ? listener : null);
	}

self.setBinaryListener = function(listener)
	{
	binaryListener = (typeof listener == "function" ? listener : null);
	}

self.onUnknownMethod = function(request, object)
	{
	if(unknownMethodListener)
		unknownMethodListener(request, object);
	}

self.onBinary = function(buffer)
	{ // Either a Buffer or an ArrayBuffer, listener must check this
	if(binaryListener)
		binaryListener(buffer);
	}

	// PIPE SERVER/SETUP CONNECTION -- -- -- -- -- -- -- -- -- -- //
self.pipe = function(pipe, _disconnectFrom, _sendMessage)
	{
	var connection = connections[pipe.connection_id];

	// This "breaks" the message path of the connection and pipes the incoming messages to a new path.
	connection.removeAllListeners("close");
	connection.removeAllListeners("message");

	connection.once("close", function()
		{
		_disconnectFrom(pipe.pipe_id);
		});

	connection.on("message", function(message, cb)
		{
		message = (message.utf8Data ? message.utf8Data : message);
		_sendMessage(message, pipe.connection_id);
		});
	}

}

module.exports = WebSocketRPCServer;
