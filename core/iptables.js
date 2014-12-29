#!/usr/bin/env node
/**
 * Spaceify iptables writer, 12.11.2014 Spaceify Inc.
 * 
 * @class Iptables
 */

var fs = require("fs");
var fibrous = require("fibrous");
var PubSub = require("./pubsub");
var Config = require("./config")();
var Utility = require("./utility");

function Iptables()
{
var self = this;

var pubSub = new PubSub();

var SPLASH_ADD_MAC = "-t mangle -I Spaceify-mangle 1 -m mac --mac-source :mac -j RETURN";
var SPLASH_REM_MAC = "-t mangle -D Spaceify-mangle -m mac --mac-source :mac -j RETURN";
var SPLASH_CHK_MAC = "-t mangle -C Spaceify-mangle -m mac --mac-source :mac -j RETURN";

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// I/O   // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
var write = function(rule, callback)
	{ // Wait for the streams to close to prevent EMFILE error (= maximum open streams exceeded)!!!
	try {
		var buf = "";
		var called = 0;
		var ws = fs.createWriteStream(Config.IPTABLES_PIPEW);
		var rs = fs.createReadStream(Config.IPTABLES_PIPER, { autoClose: false });

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

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// SPLASH   // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.splashAddRule = fibrous( function(MAC)
	{
	MAC = formatMAC(MAC);
	var splash = pubSub.value("splash", Config.IPTABLES_PATH) || {};

	if(!MAC.match(Config.MACREGX))
		return false;

	try {																				// Add to the iptables rules and splash object
		if(!self.splashHasRule(MAC))
			write.sync(Utility.replace(SPLASH_ADD_MAC, {":mac": MAC}));

		if(!splash[MAC])
			{
			splash[MAC] = {"ts": Date.now()};
			pubSub.publish("splash", splash, Config.IPTABLES_PATH);
			}
		}
	catch(err)
		{
		return false;
		}

	return true;
	});

self.splashRemoveRule = fibrous( function(MAC)
	{
	MAC = formatMAC(MAC);
	var splash = pubSub.value("splash", Config.IPTABLES_PATH) || {};

	if(!MAC.match(Config.MACREGX))
		return false;

	try {																				// Remove from the iptables rules and splash object
		if(self.splashHasRule(MAC))
			write.sync(Utility.replace(SPLASH_REM_MAC, {":mac": MAC}));

		delete splash[MAC];
		pubSub.publish("splash", splash, Config.IPTABLES_PATH);
		}
	catch(err)
		{
		return false;
		}

	return true;
	});

self.splashHasRule = function(MAC)
	{
	try {
		return write.sync(Utility.replace(SPLASH_CHK_MAC, {":mac": formatMAC(MAC)})); }
	catch(err) {
		}

	return false;
	}

self.splashRestoreRules = fibrous( function()
	{ // Restores rules not existing in the iptables
	var splash = pubSub.value("splash", Config.IPTABLES_PATH);

	for(mac in splash)
		self.sync.splashAddRule(mac);
	});

self.splashRemoveRules = fibrous( function()
	{
	var splash = pubSub.value("splash", Config.IPTABLES_PATH);

	for(mac in splash)
		self.sync.splashRemoveRule(mac);
	});

var formatMAC = function(MAC)
	{
	return MAC.toUpperCase();
	}

}

module.exports = Iptables;
