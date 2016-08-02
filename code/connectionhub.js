/**
 * Connection Hub, 11.12.2013 Spaceify Oy
 * 
 * Common hub for connecting clients top spacelets.
 * 
 * @class ConnectionHub
 */

// INCLUDES
var fs = require("fs");
var fibrous = require("fibrous");
var SpaceifyConfig = require("./spaceifyconfig");
var WebSocketRpcConnection = require("./websocketrpcconnection");

function ConnectionHub()
{
var self = this;

var config = new SpaceifyConfig();

var servers = null;

var key = config.SPACEIFY_TLS_PATH + config.SERVER_KEY;
var crt = config.SPACEIFY_TLS_PATH + config.SERVER_CRT;
var caCrt = config.SPACEIFY_WWW_PATH + config.SPACEIFY_CRT;

self.setup = fibrous( function(_servers)
	{
	servers = _servers;
	});

/* JSON-RPC AND RELATED */
var connectTo = fibrous( function(unique_name)
	{

	return true;
	});

var disconnectFrom = function(pipe_id)
	{

	}

}

module.exports = ConnectionHub;
