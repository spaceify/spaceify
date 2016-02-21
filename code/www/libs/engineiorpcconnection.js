/**
 * engine.io RPC connection, 29.7.2015 Spaceify Inc.
 *
 * class @EngineIORPCConnection
 */

function EngineIORPCConnection()
{
var self = this;

var uri = "";
var options = {};
var logger = new Logger();
var binaryListener = null;
var connectionListener = null;
var disconnectionListener = null;
var unknownMethodListener = null;

var socket = { readyState: "closed" };

var config = new SpaceifyConfig();
var network = new SpaceifyNetwork();

var E_NO_CONNECTION_EIO = "EIORPCC::connect failed ";
var E_NO_CONNECTION_CODE_EIO = "eio1";

new SpaceifyUtility().extendClass(new RPC(self), self);					// Make methods from the handler class available to this class

// The callback is a standard node-type callback with error as its first parameter
self.connect = function(opts, callback)
	{
	options.hostname = opts.hostname || config.EDGE_IP;
	options.port = opts.port || config.CORE_PORT_ENGINEIO;
	options.is_secure = opts.is_secure || false;
	options.subprotocol = opts.subprotocol || config.WS_JSON_RPC;
	options.persistent = opts.persistent || false;						// Reduce overhead by keeping connection open between calls

	uri = (!network.isSecure() && !options.is_secure ? "ws" : "wss") + "://" + options.hostname + ":" + options.port + "/json-rpc";

	// NOTICE! (SPACEIFY'S) WEBSOCKET SERVER EXPECTS SPECIFIC SUBPROTOCOL(S) - SEE "REQUIRED BY SPACEIFY" CHANGES IN js/engine.io.js
	logger.info("EIORPCC::connect " + uri);
	socket = eio.Socket(uri, {transports: ["websocket", "polling"], binaryType: "arraybuffer", spaceify_subprotocol: options.subprotocol});

	socket.on("open", function()
		{
		if(typeof connectionListener == "function")
			connectionListener();

		callback(null, true);
		});

	socket.on("close", function()
		{
		logger.info("EIORPCC::disconnect " + uri);

		if(typeof disconnectionListener == "function")
			disconnectionListener();
		});

	socket.on("error", function()
		{
		self.close();

		callback({codes: [E_NO_CONNECTION_CODE_EIO], messages: [E_NO_CONNECTION_EIO + options.hostname + ":" + options.port + ", subprotocol: " +  options.subprotocol]}, null);
		});

	socket.on("message", function(data)
		{ // The data is expected to be a string
		logger.info("EIORPCC::onMessage " + data);

		self.onMessage(data);
		});
	}

self.close = function()
	{
	binaryListener = null;
	connectionListener = null;
	disconnectionListener = null;
	unknownMethodListener = null;

	if(self.isOpen())
		socket.close();
	}

self.sendMessage = function(message)
	{ // String
	try {
		message = (typeof message == "string" ? message : JSON.stringify(message));

		logger.info("EIORPCC::sendMessage " + message);

		socket.send(message);
		}
	catch(err)
		{}
	}

self.sendBinary = function(buffer)
	{ // ArrayBuffer
	try {
		// Make ArrayBuffer?

		logger.info("EIORPCC::sendBinary length: " + buffer.byteLength);

		socket.send(buffer);
		}
	catch(err)
		{}
	}

self.isOpen = function()
	{
	return (socket.readyState == "open" ? true : false);
	}

self.isPersistent = function()
	{
	return options.persistent;
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

self.setBinaryListener = function(listener)
	{
	binaryListener = (typeof listener == "function" ? listener : null);
	}

self.onUnknownMethod = function(request, object)
	{
	if(unknownMethodListener)
		unknownMethodListener(request, object);
	}

self.onBinary = function(arraybuffer)
	{
	if(binaryListener)
		binaryListener(arraybuffer);
	}

}