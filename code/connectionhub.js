#!/usr/bin/env node
/**
 * Connection Hub, 11.12.2013 Spaceify Inc.
 * 
 * Common hub for connecting clients top spacelets.
 *
 * @class ConnectionHub
 */

// INCLUDES
var fs = require("fs");
var fibrous = require("fibrous");
var engineio = require("engine.io");
var crypt = require("./crypt");
var config = require("./config")();
var language = require("./language");
var WebSocketRPCConnection = require("./websocketrpcconnection");

function ConnectionHub()
{
var self = this;

var pipes = {};
var pipe_id = 0;
var servers = null;
var owner = "ConnectionHub";

var key = config.SPACEIFY_TLS_PATH + config.SERVER_KEY;
var crt = config.SPACEIFY_TLS_PATH + config.SERVER_CRT;
var ca_crt = config.SPACEIFY_WWW_PATH + config.SPACEIFY_CRT;

self.setup = fibrous( function(_servers)
	{
	servers = _servers;
	});

/* JSON-RPC AND RELATED */
var connectTo = fibrous( function(service_port, is_secure, server_type, connection_id)
	{
	// The principle of connectTo (piping) explained using an example.
	//
	// 1. Web page calls connectTo, hub creates new client and connects it to destination. A pipe is then created to pipe messages
	//    from hub to destination and vice versa.
	//  webpage       (webpage_server + spacelet_client)     destination
	//     /|\          /|\      /|       |\       /|\        /|\
	//      |____________|        |_______|         |__________|
	//         messages             piped             messages
	//
	// 2. Piping is implemented by capturing servers and clients normal on.message events.
	//    In on.message counterparts sendMessage methods are called directly (no extra messaging required) - denoted with --- in the example below.
	//      From spacelet:    spacelet:sendMessage -> hub_server:on.message---spacelet_client:sendMessage -> destination:on.message
	//   From destination: destination:sendMessage -> spacelet_client:on.message---hub_server:sendMessage -> spacelet:on.message

	var client = new WebSocketRPCConnection();
	var res = client.connect.sync({hostname: null, port: service_port, is_secure: is_secure, ca_crt: ca_crt, persistent: true, owner: owner});

	pipes[++pipe_id] = { client: client,
						 pipe_id: pipe_id,
						 is_secure: is_secure,
						 server_type: server_type,
						 service_port: service_port,
						 connection_id: connection_id };

	// Make the piping
	var pipe = pipes[pipe_id];
	var sobj = servers[server_type];
	sobj.server.pipe(pipe, disconnectFrom, pipe.client.sendMessage);
	pipe.client.pipe(pipe, disconnectFrom, sobj.server.sendMessage);

	return true;
	});

var disconnectFrom = function(pipe_id)
	{
	if(!pipes[pipe_id])																// Prevent multiple close calls
		return;

	// ToDo: do something (else)?

	pipes[pipe_id].client.close();

	var sobj = servers[pipes[pipe_id].server_type];
	sobj.server.closeConnection(pipes[pipe_id].connection_id);

	delete pipes[pipe_id];
	}

}

module.exports = ConnectionHub;
