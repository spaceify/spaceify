#!/usr/bin/env node
/**
 * DHCPDLog, 13.5.2015 Spaceify Inc.
 *
 * @class DHCPDLog
 */

var fibrous = require("fibrous");
var PubSub = require("./pubsub");
var config = require("./config")();

function DHCPDLog()
{
var self = this;

var pubSub = new PubSub();

self.saveToFile = function(type, ip, mac_or_duid, hostname)
	{
	pubSub.open(config.LEASES_PATH);

	var timestamp = Date.now();

	leases = pubSub.value("leases") || {};												// current ip to mac leases
	leases[ip] = {mac_or_duid: mac_or_duid, type: type, hostname: hostname, timestamp: timestamp};
	pubSub.publish("leases", leases);

	log = pubSub.value("leaseslog") || {};												// keep a log of connections
	if(log[mac_or_duid])
		log[mac_or_duid]["timestamps"].push({ts: timestamp, type: type});
	else
		log[mac_or_duid] = {hostname: hostname, timestamps: [{ts: timestamp, type: type}]};
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
	dhcpd = new DHCPDLog();
	dhcpd.saveToFile(process.argv[2], process.argv[3], process.argv[4], process.argv[5]);
	}
