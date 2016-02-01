#!/usr/bin/env node
/**
 * Service model, 20.7.2015 Spaceify Inc.
 * 
 * @class SecurityModel
 */

var fibrous = require("fibrous");
var rangeCheck = require("range_check");
var config = require("./config")();
var utility = require("./utility");
var language = require("./language");
var Communicator = require("./www/libs/communicator");

var sessions = {};
var settings = null;
var ca_crt = config.SPACEIFY_WWW_PATH + config.SPACEIFY_CRT;

function SecurityModel()
{
var self = this;

self.isLocalIP = function(ip)
	{ // Simple IP validity and IP range check - accept only local addresses
	if(!ip.match(new RegExp(config.IP_REGX)))
		return false;

	var parts = ip.split(".");
	if(parts[0] == "127" || ip == config.EDGE_IP)
		return true;

	return false;
	}

self.isApplicationIP = function(ip)
	{
	return rangeCheck.inRange(ip, config.APPLICATION_SUBNET);
	}

self.hasRequestedProtocol = function(requestedProtocols)
	{
	if(!requestedProtocols)
		return true;

	var protocols = (typeof requestedProtocols == "string" ? [requestedProtocols] : requestedProtocols);

	for(var i=0; i<protocols.length; i++)
		{
		if(config.WS_SUBPROTOCOLS.indexOf(protocols[i]) != -1)
			return true;
		}

	return true;//false;
	}

self. getEdgeURL = function()
	{
	return config.EDGE_HOSTNAME;
	}

self.getApplicationURL = function(is_secure)
	{
	return (is_secure ? "http://" : "https://") + config.EDGE_IP + ":" + (is_secure ? process.env.PORT_80 : process.env.PORT_443);
	}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// AUTHENTICATION // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.adminLogIn = function(/*mac_or_duid, */session_id, timestamp, ip)
	{
	checkSessionTTL();

	//sessions[mac_or_duid] = {"session_id": session_id, "timestamp": timestamp, "ip": ip};
	sessions[session_id] = {"timestamp": timestamp, "ip": ip};
	}

self.adminLogOut = function(/*mac_or_duid, */session_id)
	{
	// SESSION CAN BE UNSET ONLY IF THE SESSION ARE SAME
	//if(sessions[mac_or_duid] && sessions[mac_or_duid].session_id == session_id)
	//	delete sessions[mac_or_duid];

	if(sessions[session_id])
		delete sessions[session_id];

	checkSessionTTL();
	}

self.findSession = function(session_id)
	{
	checkSessionTTL();

	/*for(i in sessions)
		{
		if(sessions[i].session_id == session_id)
			return sessions[i];
		}*/
	
	for(i in sessions)
		{
		if(i == session_id)
			return sessions[i];
		}

	return null;
	}

var checkSessionTTL = function()
	{ // Remove expired sessions (= garbage collection)
	var now = Date.now();

	for(i in sessions)
		{
		if((now - sessions[i].timestamp) > settings.session_ttl)
			delete sessions[i];
		}
	}
	
	// KIWI TEMPLATE HELPER FUNCTIONS FOR ADMIN SESSION MANAGEMENT
self.isAdminLoggedIn = fibrous( function(session_id)
	{
	var coreRPC = null;
	var is_logged_in = false;

	try {
		var communicator = new Communicator();
		coreRPC = communicator.sync.connect({hostname: null, port: config.CORE_PORT_WEBSOCKET_SECURE, is_secure: true, ca_crt: ca_crt, persistent: true}, config.WEBSOCKETRPCC);

		if(!(is_logged_in = coreRPC.sync.callRpc("isAdminLoggedIn", [session_id], self)))
			throw utility.error(language.E_ADMIN_NOT_LOGGED_IN.p("Security"));
		}
	catch(err)
		{
		throw err;
		}
	finally
		{
		if(coreRPC)
			coreRPC.close();
		}

	return is_logged_in;
	});

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// MISC  // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.setSettings = function(_settings)
	{
	settings = _settings;
	}

}

module.exports = SecurityModel;
