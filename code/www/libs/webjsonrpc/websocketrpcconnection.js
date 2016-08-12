"use strict";

/**
 * WebSocketRpcConnection, 12.5.2016 Spaceify Oy
 * 
 * @class WebSocketRpcConnection
 */

function WebSocketRpcConnection()
{
// NODE.JS / REAL SPACEIFY - - - - - - - - - - - - - - - - - - - -
var isNodeJs = (typeof exports !== "undefined" ? true : false);
var isRealSpaceify = (typeof process !== "undefined" ? process.env.IS_REAL_SPACEIFY : false);
var apiPath = (isNodeJs && isRealSpaceify ? "/api/" : "/var/lib/spaceify/code/");

var classes = 	{
				SpaceifyError: (isNodeJs ? require(apiPath + "spaceifyerror") : SpaceifyError),
				SpaceifyUtility: (isNodeJs ? require(apiPath + "spaceifyutility") : SpaceifyUtility),
				RpcCommunicator: (isNodeJs ? require(apiPath + "rpccommunicator") : RpcCommunicator),
				WebSocketConnection: (isNodeJs ? require(apiPath + "websocketconnection") : WebSocketConnection)
				};
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

var self = this;

var errorc = new classes.SpaceifyError();
var utility = new classes.SpaceifyUtility();
var communicator = new classes.RpcCommunicator();
var connection = new classes.WebSocketConnection();

self.connect = function(options, callback)
	{
	connection.connect(options, function(err, data)
		{
		if(!err)
			{
			communicator.addConnection(connection);

			var debug = ("debug" in options ? options.debug : false);
			communicator.setOptions({ debug: debug });

			if(callback)
				callback(null, true);
			}
		else
			{
			if(callback)
				callback(errorc.makeErrorObject("wsrpcc", "Failed to open WebsocketRpcConnection.", "WebSocketRpcConnection::connect"), null);
			}
		});
	};

self.close = function()
	{
	};

self.getCommunicator = function()
	{
	return communicator;
	};

self.getConnection = function()
	{
	return connection;
	};

// Inherited methods
self.exposeRpcMethod = function(name, object, method)
	{
	communicator.exposeRpcMethod(name, object, method);
	}

self.callRpc = function(method, params, object, listener)
	{
	return communicator.callRpc(method, params, object, listener, connection.getId());
	}

self.getIsOpen = function()
	{
	return connection.getIsOpen();
	}

self.getIsSecure = function()
	{
	return connection.getIsSecure();
	}

self.getPort = function()
	{
	return connection.getPort();
	}

self.getId = function()
	{
	return connection.getId();
	}

// External event listeners
self.setConnectionListener = function(listener)
	{
	communicator.setConnectionListener(listener);
	};

self.setDisconnectionListener = function(listener)
	{
	communicator.setDisconnectionListener(listener);
	};

}

if(typeof exports !== "undefined")
	{
	module.exports = WebSocketRpcConnection;
	}
