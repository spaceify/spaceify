#!/usr/bin/env node
/**
 * DNSServer service, 19.11.2014 Spaceify Inc.
 * 
 */

var fs = require("fs");
var Config = require("./config")();
var DNSServer = require("./dnsserver");

var url2ip = {};
url2ip[Config.EDGE_HOSTNAME] = {ip: Config.EDGE_IP, ttl: 0, class: 1};

var external_ip;																		// Get the external IP acquired during Spaceify's installation
try {
	external_ip = fs.readFileSync(Config.EXTERNAL_DNS_IP, {encoding: "utf8"});
	external_ip = external_ip.replace(/[^0-9\.]/g, "");
	}
catch(err)
	{
	external_ip = "8.8.8.8";
	}

var dnsserver = new DNSServer();
dnsserver.connect({ port: Config.DNS_PORT,												// The port and address to listen
					v4_address: Config.EDGE_IP,
					v6_address: null,//Config.EDGE_IP_V6
					external_dns: { address: external_ip, port: 53, type: "udp" },		// For making questions from an external DNS server
					ttl: 600,															// Time To Live period the clients should cache the returned answers

					url2ip: url2ip,														// Redirect URLs straight to IPs without requesting them from extrenal DNS
					default_response: {ip: Config.EDGE_IP, type: "A", class: 1}			// If DNS request fails return the default response
					//, debug: true
					});
