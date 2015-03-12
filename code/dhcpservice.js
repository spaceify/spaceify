#!/usr/bin/env node
/**
 * DHCPServer service, 19.11.2014 Spaceify Inc.
 * 
 */

var fibrous = require("fibrous");
var Config = require("./config")();
var DHCPServer = require("./dhcpserver");

fibrous.run(function()
	{
	var dhcpserver = new DHCPServer();
	dhcpserver.sync.connect({subnet: Config.EDGE_SUBNET,
							 range_start: Config.EDGE_IP_RANGE_START,
							 range_end: Config.EDGE_IP_RANGE_END,
							 routers: [ Config.EDGE_IP ],
							 dnsservers: [ Config.EDGE_IP, Config.EDGE_IP, Config.EDGE_IP ],
							 siaddr: Config.EDGE_IP,
							 giaddr: "0.0.0.0",//Config.EDGE_IP,
							 lease_time: Config.EDGE_DHCP_LEASE_TIME,
							 domain_name: Config.EDGE_HOSTNAME
							});
	});
