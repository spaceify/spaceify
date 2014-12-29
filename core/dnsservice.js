#!/usr/bin/env node
/**
 * DNSServer service, 19.11.2014 Spaceify Inc.
 * 
 */

var Config = require("./config")();
var DNSServer = require("./dnsserver");

var url2ip = {};
url2ip[Config.EDGE_HOSTNAME] = {ip: Config.EDGE_IP, ttl: 0};

var dnsserver = new DNSServer();
dnsserver.connect({ port: Config.DNS_PORT,						// The port and address to listen
					v4_address: Config.EDGE_IP,
					v6_address: null/*Config.EDGE_IP_V6*/,
					url2ip: url2ip,								// Redirects URLs to IPs
					default_ip: Config.EDGE_IP,					// If DNS fails return the default URL and address
					default_hostname: Config.EDGE_HOSTNAME,
					external_dns: Config.EDGE_IP,				// For making DNS questions from external server, use local IP if local resolv.conf adress(es) is used
					ttl: 600									// Time To Live period the clients should cache the returned answers
					});
