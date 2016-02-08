#!/usr/bin/env node
/**
 * WebSocket server, 18.9.2013 Spaceify Inc.
 *
 * @class WebSocketServer
 */

// INCLUDES
var fs = require("fs");
var http = require("http");
var https = require("https");
var WebSocketServerN = require("websocket").server;
var crypt = require("./crypt");
var logger = require("./www/libs/logger");
var config = require("./config")();
var utility = require("./utility");
var language = require("./language");

function WebSocketServer()
{
var self = this;

var options = {};
var wsServer = null;
var webServer = null;
var connections = {};		// We can handle multiple incoming connections
var callSequence = 1;
var connectionSequence = 0;

var binaryListener = null;
var accessListener = null;
var messageListener = null;
var serverUpListener = null;
var serverDownListener = null;
var connectionListener = null;
var disconnectionListener = null;

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
	options.class = "WSS";
	options.server_type = opts.server_type || (!options.is_secure ? config.WEBSOCKET_SERVER : config.WEBSOCKET_SERVER_SECURE);
	options.user_object = opts.user_object || null;

	options.debug = opts.debug || true;
	logger.setOptions({write_to_console: options.debug});

	logger.info(utility.replace(language.WEBSOCKET_OPENING, {":owner": options.owner, ":class": options.class, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port, ":subprotocol": options.subprotocol}));

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
			serverUpListener({server_type: options.server_type, is_secure: options.is_secure});

		callback(null, true);
		});

	webServer.on("error", function(err)
		{
		if(serverDownListener)
			serverDownListener({server_type: options.server_type, is_secure: options.is_secure});

		callback(err, null);
		});

	webServer.on("close", function()
		{
		if(serverDownListener)
			serverDownListener({server_type: options.server_type, is_secure: options.is_secure});
		});

		// CREATE THE WEBSOCKET SERVER -- -- -- -- -- -- -- -- -- -- //
	wsServer = new WebSocketServerN(
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

		logger.info(utility.replace(language.WEBSOCKET_CONNECTION_REQUEST, {":owner": options.owner, ":class": options.class, ":origin": request.origin, ":protocol": options.protocol, ":address": remoteAddress, ":port": remotePort, ":id": connectionSequence}));

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

			connections[cid].on("message", function(message) { onMessage(message, this); });
			connections[cid].on("close", function(reasonCode, description) { self.closeConnection(this); });
			//connections[cid].on("error", function(error) { self.closeConnection(this); });

			if(connectionListener)
				connectionListener(	utility.createServerObject(
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
	messageListener = null;
	serverUpListener = null;
	serverDownListener = null;
	connectionListener = null;
	disconnectionListener = null;

	if(wsServer)
		{
		logger.info(utility.replace(language.WEBSOCKET_CLOSING, {":owner": options.owner, ":class": options.class, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port, ":subprotocol": options.subprotocol}));

		wsServer.shutDown();
		wsServer = null;
		}

	if(webServer)
		{
		logger.info(utility.replace(language.WEBSOCKET_CLOSING_WEB, {":owner": options.owner, ":class": options.class, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port}));

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
		logger.info(utility.replace(language.WEBSOCKET_CLOSE_CONNECTION, {":owner": options.owner, ":class": options.class, ":origin": connection.origin, ":protocol": options.protocol, ":hostname": connection.remoteAddress, ":port": connection.remotePort, ":subprotocol": options.subprotocol, ":id": connection.id}));

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

		logger.info(utility.replace(language.WEBSOCKET_SEND_MESSAGE, {":owner": options.owner, ":class": options.class, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port, ":subprotocol": options.subprotocol, ":id": connection.id, ":message": message}));

		connection.send(message);
		}
	catch(err)
		{}
	}

self.sendBinary = function(buffer, connection)
	{ // Buffer
	try {
		if(typeof connection !== "object")
			connection = connections[connection];

		buffer = utility.toBuffer(buffer);

		logger.info(utility.replace(language.WEBSOCKET_SEND_BINARY, {":owner": options.owner, ":class": options.class, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port, ":subprotocol": options.subprotocol, ":id": connection.id, ":length": buffer.length}));

		connection.send(buffer);
		}
	catch(err)
		{}
	}

var onMessage = function(message, connection)
	{
	message = (message.type == "utf8" ? message.utf8Data : message.binaryData);

	logger.info(utility.replace(language.WEBSOCKET_ON_MESSAGE, {":owner": options.owner, ":class": options.class, ":protocol": options.protocol, ":hostname": options.hostname, ":port": options.port, ":subprotocol": options.subprotocol, ":id": connection.id, ":message": message}));

	if(messageListener)
		messageListener(message, connection);

	connection.send(buffer);
	}

self.getBufferedAmount = function(connection)
	{
	var amount = 0;

	try {
		if(typeof connection !== "object")
			connection = connections[connection];

		amount = connection.getBufferedAmount();
		}
	catch(err)
		{}

	return amount;
	};

self.isOpen = function()
	{
	return (webServer && wsServer == "open" ? true : false);
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

self.setAccessListener = function(listener)
	{
	accessListener = (typeof listener == "function" ? listener : null);
	}

self.setMessageListener = function(listener)
	{
	messageListener	= (typeof listener == "function" ? listener : null);
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

}

module.exports = WebSocketServer;
