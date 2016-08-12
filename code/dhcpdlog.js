"use strict";

/**
 * DHCPDLog, 13.5.2015 Spaceify Oy
 *
 * @class DHCPDLog
 */

var fibrous = require("fibrous");
var PubSub = require("./pubsub");
var SpaceifyConfig = require("./spaceifyconfig");

function DHCPDLog()
{
var self = this;

var pubSub = new PubSub();
var config = new SpaceifyConfig();

self.saveToFile = function(type, ip, macOrDuid, hostname)
	{
	var log;
	var leases;
	var timestamp;

	pubSub.open(config.LEASES_PATH);

	timestamp = Date.now();

	leases = pubSub.value("leases") || {};												// Current ip to mac leases
	leases[ip] = {macOrDuid: macOrDuid, type: type, hostname: hostname, timestamp: timestamp};
	pubSub.publish("leases", leases);

	log = pubSub.value("leaseslog") || {};												// Keep a log of connections
	if(log[macOrDuid])
		log[macOrDuid]["timestamps"].push({ts: timestamp, type: type});
	else
		log[macOrDuid] = {hostname: hostname, timestamps: [{ts: timestamp, type: type}]};
	pubSub.publish("leaseslog", log);

	pubSub.close();
	}

self.getDHCPLeaseByIP = function(ip)
	{
	var leases = pubSub.value("leases", config.LEASES_PATH);

	return (leases && leases[ip] ? leases[ip] : null);
	}

}

module.exports = DHCPDLog;

if(process.argv.length == 6)																// isc-dhcp-server server called this script
	{
	var dhcpd = new DHCPDLog();
	dhcpd.saveToFile(process.argv[2], process.argv[3], process.argv[4], process.argv[5]);
	}
