/**
 * Server by Spaceify Inc. 29.7.2015
 *
 * Upper layer for different types of servers.
 *
 * class @Server
 */

function Server(type)
{
var self = this;

var api_path = process.env.IS_REAL_SPACEIFY ? "/api/" : "/var/lib/spaceify/code/";

var config = require(api_path + "config")();
var EngineIoRPCServer = require(api_path + "engineiorpcserver");
var WebSocketRPCServer = require(api_path + "websocketrpcserver");

var server = null;

self.connect = function(opts, callback)
	{
	if(type == config.WEBSOCKET_RPC_SERVER)
		server = new WebSocketRPCServer();
	else if(type == config.ENGINEIO_RPC_SERVER)
		server = new EngineIoRPCServer();

	if(server)
	{
		server.connect(opts, function(err, data)
			{
			if(err)
				callback(err, null);
			else
				callback(null, server);
			});
	}
	}

self.getServer = function()
	{
	return server;
	}

}

module.exports = Server;