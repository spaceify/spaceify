/**
 * WebSocket connection, 21.1.2016 by Spaceify Inc.
 *
 * class @WebSocketConnection
 */

function WebSocketConnection()
{
var self = this;

var uri = "";
var options = {};
var logger = new Logger();
var binaryListener = null;
var messageListener = null;
var connectionListener = null;
var disconnectionListener = null;

var socket = { readyState: 0 };

var config = new SpaceifyConfig();
var network = new SpaceifyNetwork();

var E_NO_CONNECTION_WS = "WSC::connect() failed ";
var E_NO_CONNECTION_CODE_WS = "ws1";

// The callback is a standard node-type callback with error as its first parameter
self.connect = function(opts, callback)
	{
	options.hostname = opts.hostname || config.EDGE_IP;
	options.port = opts.port || config.CORE_PORT_ENGINEIO;
	options.is_secure = opts.is_secure || false;
	options.subprotocol = opts.subprotocol || config.WS_JSON_RPC;
	options.persistent = opts.persistent || false;						// Reduce overhead by keeping connection open between calls

	uri = (!network.isSecure() && !options.is_secure ? "ws" : "wss") + "://" + options.hostname + ":" + options.port + "/";
	logger.info("WSC::connect() " + uri);

	socket = new WebSocket(uri, config.WS_JSON_RPC);
	socket.binaryType = "arraybuffer";

	socket.onopen = function()
		{
		if(typeof connectionListener == "function")
			connectionListener();

		callback(null, true);
		};

	socket.onclose = function(typeArg, closeEventInit)
		{ 
		logger.info("WSC::disconnect " + uri);

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
		logger.info("WSC::onMessage() " + evt.data);
		onMessage(evt.data);
		}

	}

self.close = function()
	{
	binaryListener = null;
	messageListener = null;
	connectionListener = null;
	disconnectionListener = null;

	if(self.isOpen())
		socket.close();
	}

self.sendMessage = function(message)
	{ // String
	try {
		message = (typeof message == "string" ? message : JSON.stringify(message));

		logger.info("WSC::sendMessage() " + message);

		socket.send(message);
		}
	catch(err)
		{}
	}

self.sendBinary = function(buffer)
	{ // ArrayBuffer
	try {
		// Make ArrayBuffer?

		logger.info("WSC::sendBinary() length: " + buffer.byteLength);

		socket.send(buffer);
		}
	catch(err)
		{}
	}

var onMessage = function(message)
	{
	logger.info("WSC::onMessage() " + message);

	if(messageListener)
		messageListener(message);
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

self.setMessageListener = function(listener)
	{
	messageListener = (typeof listener == "function" ? listener : null);
	}

self.setBinaryListener = function(listener)
	{
	binaryListener = (typeof listener == "function" ? listener : null);
	}

self.onBinary = function(arraybuffer)
	{ // Either a Buffer or an ArrayBuffer, listener must check this
	if(binaryListener)
		binaryListener(arraybuffer);
	}

}