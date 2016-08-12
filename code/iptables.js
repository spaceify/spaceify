"use strict";

/**
 * Spaceify iptables writer, 12.11.2014 Spaceify Oy
 * 
 * @class Iptables
 */

var fs = require("fs");
var fibrous = require("fibrous");
var PubSub = require("./pubsub");
var SpaceifyConfig = require("./spaceifyconfig");
var SpaceifyUtility = require("./spaceifyutility");

function Iptables()
{
var self = this;

var pubSub = new PubSub();
var config = new SpaceifyConfig();
var utility = new SpaceifyUtility();

var SPLASH_ADD_MAC = "-t mangle -I Spaceify-mangle 1 -m mac --mac-source :mac -j RETURN";		// NOTICE! Add to the top of the rules.
var SPLASH_DEL_MAC = "-t mangle -D Spaceify-mangle -m mac --mac-source :mac -j RETURN";
var SPLASH_CHK_MAC = "-t mangle -C Spaceify-mangle -m mac --mac-source :mac -j RETURN";

	// I/O -- -- -- -- -- -- -- -- -- -- //
var write = function(rule, callback)
	{ // Wait for the streams to close to prevent EMFILE error (= maximum open streams exceeded)!!!
	try {
		var buf = "";
		var called = 0;
		var ws = fs.createWriteStream(config.IPTABLES_PIPEW);
		var rs = fs.createReadStream(config.IPTABLES_PIPER, { autoClose: false });

		var ready = function(err)
			{
			if(++called == 2)
				callback((err ? err : null), (err ? null : (buf.length > 1 ? false : true)));
			}

		rs.on("data", function(data) { buf += data.toString(); });
		rs.on("end", function() { rs.destroy(); ready(null); });
		rs.on("close", function() { rs.destroy(); ready(null); });
		rs.on("error", function(err) { rs.destroy(); ready(err); });

		ws.write(rule + "\n");
		ws.end();
		ws.destroy();
		ws.on("finish", function() { ready(null); });
		ws.on("error", function(err) { ready(err); });
		}
	catch(err)
		{
		callback(err, null);
		}
	}

	// SPLASH -- -- -- -- -- -- -- -- -- -- //
self.splashAddRule = fibrous( function(MAC)
	{
	var splash = pubSub.value("splash", config.IPTABLES_PATH) || {};

	if(!utility.isMAC(MAC))
		return false;

	try {																				// Add to the iptables rules and splash object
		if(!self.sync.splashHasRule(MAC))
			write.sync(utility.replace(SPLASH_ADD_MAC, {"~mac": MAC}));

		if(!splash[MAC])
			{
			splash[MAC] = {"timestamp": Date.now()};
			pubSub.publish("splash", splash, config.IPTABLES_PATH);
			}
		}
	catch(err)
		{
		return false;
		}

	return true;
	});

self.splashDeleteRule = fibrous( function(MAC)
	{
	var splash = pubSub.value("splash", config.IPTABLES_PATH) || {};

	if(!utility.isMAC(MAC))
		return false;

	try {																				// Remove from the iptables rules and splash object
		if(self.sync.splashHasRule(MAC))
			write.sync(utility.replace(SPLASH_DEL_MAC, {"~mac": MAC}));

		delete splash[MAC];
		pubSub.publish("splash", splash, config.IPTABLES_PATH);
		}
	catch(err)
		{
		return false;
		}

	return true;
	});

self.splashDeleteRules = fibrous( function()
	{
	var splash = pubSub.value("splash", config.IPTABLES_PATH);

	for(var mac in splash)
		self.sync.splashDeleteRule(mac);
	});

self.splashRestoreRules = fibrous( function()
	{ // Restores rules not existing in the iptables
	var splash = pubSub.value("splash", config.IPTABLES_PATH);

	for(var mac in splash)
		self.sync.splashAddRule(mac);
	});

self.splashHasRule = function(MAC)
	{
	try { return write.sync(utility.replace(SPLASH_CHK_MAC, {"~mac": MAC})); }
	catch(err) { return false; }
	}

	// CONTAINER CONNECTIONS -- -- -- -- -- -- -- -- -- -- //
self.removeRules = fibrous( function()
	{
	var connections = pubSub.value("connections", config.IPTABLES_PATH) || {};
/*
	{
	"service_name": {sourceIp: , destinationIp, destinationPort}
	}
*/
	});

self.allowConnection = fibrous( function(sourceIp, destinationIp, destinationPort)
	{
	//iptables -D INPUT -m mac --mac-source aa:BB:cc:aD:Ff:ac -j RETURN

	//write.sync("-A INPUT -m mac --mac-source aa:BB:cc:aD:Ff:ac -j RETURN");
// ip -> ip+port
	});

self.disallowConnection = fibrous( function(sourceIp, destinationIp, destinationPort)
	{
	write.sync("-D INPUT -m mac --mac-source aa:BB:cc:aD:Ff:ac -j RETURN");
	});

self.hasConnectionRule = fibrous( function(sourceIp, destinationIp, destinationPort)
	{
	try { return write.sync(utility.replace("-C INPUT -m mac --mac-source aa:BB:cc:aD:Ff:ac -j RETURN")); }
	catch(err) { return false; }
	});

}

module.exports = Iptables;
