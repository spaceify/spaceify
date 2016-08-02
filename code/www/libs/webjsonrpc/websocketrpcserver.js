"use strict";

/**
 * WebSocketRpcServer, 21.6.2016 Spaceify Oy
 * 
 * @class WebSocketRpcServer
 */

function WebSocketRpcServer()
{
// NODE.JS / REAL SPACEIFY - - - - - - - - - - - - - - - - - - - -
var isNodeJs = (typeof exports !== "undefined" ? true : false);
var isRealSpaceify = (typeof process !== "undefined" ? process.env.IS_REAL_SPACEIFY : false);
var apiPath = (isNodeJs && isRealSpaceify ? "/api/" : "/var/lib/spaceify/code/");

var classes = 	{
				SpaceifyConfig: (isNodeJs ? require(apiPath + "spaceifyconfig") : SpaceifyConfig),
				RpcCommunicator: (isNodeJs ? require(apiPath + "rpccommunicator") : RpcCommunicator),
				WebSocketServer: (isNodeJs ? require(apiPath + "websocketserver") : WebSocketServer)
				};
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

var self = this;

var config = new classes.SpaceifyConfig();
var communicator = new classes.RpcCommunicator();
var webSocketServer = new classes.WebSocketServer();

webSocketServer.setEventListener(communicator);

self.listen = function(options, callback)
	{
	var debug = ("debug" in options ? options.debug : false);
	communicator.setOptions({ debug: debug });

	try {
		webSocketServer.listen(options, callback);
		}
	catch(err)
		{}
	}

self.close = function()
	{
	webSocketServer.close();
	}

self.getCommunicator = function()
	{
	return communicator;
	}

self.getServer = function()
	{
	return webSocketServer;
	}

// Inherited methods
self.getPort = function()
	{
	return webSocketServer.getPort();
	}

self.getIsOpen = function()
	{
	return webSocketServer.getIsOpen();
	}

self.getIsSecure = function()
	{
	return webSocketServer.getIsSecure();
	}

self.getId = function()
	{
	return webSocketServer.getId();
	}

self.exposeRpcMethod = function(name, object, method)
	{
	communicator.exposeRpcMethod(name, object, method);
	}

self.nofifyAll = function(method, params)
	{
	communicator.nofifyAll(method, params);
	}

self.callRpc = function()
	{ // arguments contains a connection id!
	communicator.callRpc.apply(this, arguments);
	}

self.setConnectionListener = function(listener)
	{
	communicator.setConnectionListener(listener);
	}

self.setDisconnectionListener = function(listener)
	{
	communicator.setDisconnectionListener(listener);
	}

self.setServerUpListener = function(listener)
	{
	webSocketServer.setServerUpListener(typeof listener == "function" ? listener : null);
	}

self.setServerDownListener = function(listener)
	{
	webSocketServer.setServerDownListener(typeof listener == "function" ? listener : null);
	}

}

if(typeof exports !== "undefined")
	module.exports = WebSocketRpcServer;