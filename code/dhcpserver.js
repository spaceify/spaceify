#!/usr/bin/env node
/**
 * DHCPServer, 31.10.2014 Spaceify Inc.
 * 
 * Based on glaszig/node-dhcpd - https://github.com/glaszig/node-dhcpd
 * 
 * @class DHCPServer
 */

var fibrous = require("fibrous");
var PubSub = require("./pubsub");
var Config = require("./config")();
var dhcpd = require("./lib/dhcpd");
var mem_store = require("./lib/memory-store");

function DHCPServer()
{
var self = this;

var store = null;
var options = {};
var dhcpserver = null;
var pubSub = new PubSub();

self.connect = fibrous( function(opts)
	{
	options.subnet = opts.subnet || Config.EDGE_SUBNET;
	options.range_start = opts.range_start || Config.EDGE_IP_RANGE_START;
	options.range_end = opts.range_end || Config.EDGE_IP_RANGE_END;
	options.routers = opts.routers || [ Config.EDGE_IP ];
	options.dnsservers = opts.dnsservers || [ Config.EDGE_IP ];
	options.siaddr = opts.siaddr || Config.EDGE_IP;
	options.giaddr = opts.giaddr || Config.EDGE_IP;
	options.default_lease = opts.default_lease || 3600;
	options.domain_name = opts.domain_name || "local";

	store = new mem_store(options.range_start, options.range_end);
	options.save_lease = function(lease, cb) { saveLease(lease, cb); };
	options.get_lease = function(mac_addr, cb) { store.get_lease(mac_addr, cb); };
	options.get_lease_by_ip = function(ip, cb) { store.get_lease_by_ip(ip, cb); };
	options.get_next_ip = function(cb) { store.get_next_ip(cb); };
	options.remove_lease = function(mac_addr, cb) { removeLease(mac_addr, cb); };

	dhcpserver = new dhcpd(options);
	});

self.close = function()
	{
	}

var saveLease = function(lease, cb)
	{
	store.save_lease(lease, cb);
	self.saveToFile(lease, "add");
	}

var removeLease = function(mac_addr, cb)
	{
	store.get_lease(mac_addr, function(lease)
		{
		store.remove_lease(mac_addr, cb);
		self.saveToFile(lease, "rem");
		});
	}

self.saveToFile = function(lease, type)
	{
	pubSub.open(Config.LEASES_PATH);

	var type = type;
	var ip = lease.yiaddr;
	var timestamp = Date.now();
	var mac_or_duid = lease.chaddr;
	var hostname = lease.offer.options["12"];								// see /lib/node-dhcpd/lib/packet/converters.js for more useful options

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
	var leases = pubSub.value("leases", Config.LEASES_PATH);
	return (leases && leases[ip] ? leases[ip] : null);
	}

}

module.exports = DHCPServer;
