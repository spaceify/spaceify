/**
 * Communicator by Spaceify Inc. 29.7.2015
 *
 * Upper layer for different types of connections.
 *
 * class @Communicator
 */

function Communicator(type)
{
var self = this;

var id = 0;

var communicator = null;

var isNodeJS = (typeof exports !== "undefined" ? true : false);

if(isNodeJS)
	{
	var api_path = process.env.IS_REAL_SPACEIFY ? "/api/" : "/var/lib/spaceify/code/";

	var utility = require(api_path + "utility");
	var config = require(api_path + "config")();
	var webSocketConnection = require(api_path + "websocketconnection");
	//var engineIORPCConnection = require(api_path + "engineiorpcconnection");
	var webSocketRPCConnection = require(api_path + "websocketrpcconnection");
	}
else
	{
	var utility = new SpaceifyUtility();
	var config = new SpaceifyConfig();
	var webSocketConnection = WebSocketConnection;
	var engineIORPCConnection = EngineIORPCConnection;
	var webSocketRPCConnection = WebSocketRPCConnection;
	}

self.connect = function(opts, callback)
	{
	if(type == config.WEBSOCKET_RPC_COMMUNICATOR)
		{
		if(isNodeJS)
			communicator = new webSocketRPCConnection();
		else
			communicator = window.WebSocket ? new webSocketRPCConnection() : new engineIORPCConnection();
		}
	else if(type == config.WEBSOCKET_COMMUNICATOR)
		communicator = new webSocketConnection();

	if(communicator)
		{
		communicator.connect(opts, function(err, data)
			{
			if(err)
				callback(err, null, -1);
			else
				callback(null, communicator, ++id);
			});
		}
	else
		callback({code: "comm1000", message: "Creating communicator failed."}, null, -1);
	}

self.getCommunicator = function()
	{
	return communicator;	
	}

}

if(typeof exports !== "undefined")
	module.exports = Communicator;