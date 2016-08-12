"use strict";

/**
 * DNSServer service, 19.11.2014 Spaceify Oy
 * 
 */

var fs = require("fs");
var DNSServer = require("./dnsserver");
var Logger = require("./logger");
var SpaceifyConfig = require("./spaceifyconfig");

var logger = new Logger();
var config = new SpaceifyConfig();

process.title = "spaceifydns";															// Shown in ps aux

var url2ip = {};																		// Edges hostnames
url2ip[config.EDGE_HOSTNAME] = {ip: config.EDGE_IP, ttl: 0, class: 1};
url2ip[config.EDGE_SHORT_HOSTNAME] = {ip: config.EDGE_IP, ttl: 0, class: 1};

var external_ip;																		// Get the external IP acquired during Spaceify's installation
try {
	external_ip = fs.readFileSync(config.EXTERNAL_DNS_IP, {encoding: "utf8"});
	}
catch(err)
	{
	external_ip = "8.8.8.8";
	}

external_ip = external_ip.replace(/[^0-9\.]/g, "");

try {
	var dnsserver = new DNSServer();
	dnsserver.connect({	port: config.DNS_PORT,											// The port and address to listen
						v4_address: config.EDGE_IP,
						v6_address: config.DNS_IP_V6,
						external_dns: { address: external_ip, port: 53, type: "udp" },	// The questions are passed to the external DNS server
						ttl: 10,														// Time To Live period the clients should cache the returned answers

						url2ip: url2ip,													// Redirect URLs straight to IPs without requesting them from extrenal DNS
						default_response: {ip: config.EDGE_IP, type: 1, class: 1},		// If DNS request fails return the default response
						debug: false
						});
	}
catch(err)
	{
	logger.error(err, true, true, logger.ERROR);
	}
