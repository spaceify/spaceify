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
var utility = require(api_path + "utility");
var EngineIoRPCServer = require(api_path + "engineiorpcserver");
var WebSocketRPCServer = require(api_path + "websocketrpcserver");

var server = null;
if(type == config.WEBSOCKETRPCS)
	server = new WebSocketRPCServer();
else if(type == config.ENGINEIORPCS)
	server = new EngineIoRPCServer();

utility.extendClass(server, self);

self.connect = function(opts, callback)
	{
	if(!server)
		callback(true, null);

	server.connect(opts, function(err, data)
		{
		if(err)
			callback(err, null);
		else
			callback(null, server);
		});
	}

}

module.exports = Server;