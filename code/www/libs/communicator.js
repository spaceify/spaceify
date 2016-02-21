/**
 * Communicator by Spaceify Inc. 29.7.2015
 *
 * Upper layer for different types of connections.
 *
 * class @Communicator
 */

function Communicator()
{
var self = this;

var id = 0;

var isNodeJS = (typeof exports !== "undefined" ? true : false);

if(isNodeJS)
	{
	var api_path = process.env.IS_REAL_SPACEIFY ? "/api/" : "/var/lib/spaceify/code/";

	var utility = require(api_path + "utility");
	var config = require(api_path + "config")();
	var _WebSocketConnection = require(api_path + "websocketconnection");
	//var _EngineIORPCConnection = require(api_path + "engineiorpcconnection");
	var _WebSocketRPCConnection = require(api_path + "websocketrpcconnection");
	}
else
	{
	var utility = new SpaceifyUtility();
	var config = new SpaceifyConfig();
	var _WebSocketConnection = WebSocketConnection;
	var _EngineIORPCConnection = EngineIORPCConnection;
	var _WebSocketRPCConnection = WebSocketRPCConnection;
	}

self.connect = function(opts, type, callback)
	{
	var communicator = null;

	if(type == config.WEBSOCKETRPCC)
		{
		if(isNodeJS)
			communicator = new _WebSocketRPCConnection();
		else
			communicator = window.WebSocket ? new _WebSocketRPCConnection() : new _EngineIORPCConnection();
		}
	else if(type == config.WEBSOCKETC)
		communicator = new _WebSocketConnection();

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

}

if(typeof exports !== "undefined")
	module.exports = Communicator;