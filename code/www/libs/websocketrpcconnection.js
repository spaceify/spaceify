/**
 * WebSocket RPC connection, 14.8.2015 Spaceify Inc.
 *
 * class @WebSocketRPCConnection
 */

function WebSocketRPCConnection()
{
var self = this;

var uri = "";
var options = {};
var logger = new Logger();
var binaryListener = null;
var connectionListener = null;
var disconnectionListener = null;
var unknownMethodListener = null;

var socket = { readyState: 0 };

var config = new SpaceifyConfig();

var E_NO_CONNECTION_WS = "WSRPCC::connect() failed ";
var E_NO_CONNECTION_CODE_WS = "ws1";

new SpaceifyUtility().extendClass(new RPC(self), self);					// Make methods from the handler class available to this class

// The callback is a standard node-type callback with error as its first parameter
self.connect = function(opts, callback)
	{
	options.hostname = opts.hostname || config.EDGE_IP;
	options.port = opts.port || config.CORE_PORT_ENGINEIO;
	options.is_secure = opts.is_secure || false;
	options.subprotocol = opts.subprotocol || config.WS_JSON_RPC;
	options.persistent = opts.persistent || false;						// Reduce overhead by keeping connection open between calls

	uri = (!options.is_secure ? "ws" : "wss") + "://" + options.hostname + ":" + options.port + "/";
	logger.info("WSRPCC::connect() " + uri);

	socket = new WebSocket(uri, config.WS_JSON_RPC);
	socket.binaryType = "arraybuffer";

	socket.onopen = function()
		{
		if(typeof connectionListener == "function")
			connectionListener();

		callback(null, true);
		};

	socket.onclose = function()
		{ 
		logger.info("WSRPCC::disconnect " + uri);

		if(typeof disconnectionListener == "function")
			disconnectionListener();
		};

	socket.onerror = function(evt)
		{
		self.close();

		callback({codes: [E_NO_CONNECTION_CODE_WS], messages: [E_NO_CONNECTION_WS + options.hostname + ":" + options.port + ", subprotocol: " +  options.subprotocol]}, null);
		}

	socket.onmessage = function(evt)
		{ // The data is expected to be a string
		self.onMessage(evt.data);
		}

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

		logger.info("WSRPCC::sendMessage() " + message);

		socket.send(message);
		}
	catch(err)
		{}
	}

self.sendBinary = function(buffer)
	{ // ArrayBuffer
	try {
		// Make ArrayBuffer?

		logger.info("WSRPCC::sendBinary() length: " + buffer.byteLength);

		connection.send(buffer);
		}
	catch(err)
		{}
	}

self.isOpen = function()
	{
	return (socket.readyState == 1 ? true : false);
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
	{ // Either a Buffer or an ArrayBuffer, listener must check this
	if(binaryListener)
		binaryListener(arraybuffer);
	}

}