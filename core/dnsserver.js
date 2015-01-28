#!/usr/bin/env node
/**
 * DNSServer, 22.10.2014 Spaceify Inc.
 * 
 * @class DNSServer
 */

var dns = require("native-dns");
var Config = require("./config")();
var Netmask = require('netmask').Netmask

function DNSServer()
{
var self = this;

var debug = false;
var options = {};
var serverUDP4 = null;
var serverUDP6 = null;
var serverTCP4 = null;
var serverTCP6 = null;

self.connect = function(opts)
	{
	options.port = opts.port || 53;
	options.v4_address = opts.v4_address || null;
	options.v6_address = opts.v6_address || null;
	options.url2ip = opts.url2ip || {};
	options.ttl = opts.ttl || 0;
	options.default_ip = opts.default_ip || null;
	options.default_hostname = opts.default_hostname || null;
	options.external_dns = opts.external_dns || "8.8.8.8";
	options.subnet = opts.subnet || Config.EDGE_SUBNET;

	serverUDP4 = dns.createUDPServer({dgram_type: "udp4"});
	serverUDP6 = dns.createUDPServer({dgram_type: "udp6"});
	//serverTCP4 = dns.createTCPServer({dgram_type: "tcp4"});
	//serverTCP6 = dns.createTCPServer({dgram_type: "tcp6"});

	startServer(serverUDP4, options.port, options.v4_address, "udp4");
	startServer(serverUDP6, options.port, options.v6_address, "udp6");
	//startServer(serverTCP4, options.port, "tcp4");
	//startServer(serverTCP6, options.port, "tcp6");
	}

self.close = function()
	{
	if(serverUDP4)
		serverUDP4.close();
	if(serverUDP6)
		serverUDP6.close();
	if(serverTCP4)
		serverTCP4.close();
	if(serverTCP6)
		serverTCP6.close();
	}
	
var startServer = function(server, port, address, type)
	{
	server.on("request", function(request, response)
		{
		var question = request.question[0];
		var name = question.name;
		var type = question.type;
		if(name in options.url2ip)																	// Redirect URLs to IPs
			sendLocalURL(response, name, type, 1, options.url2ip[name].ttl, options.url2ip[name].ip);
		else
			makeRequest(question, response);
		});

	server.on("listening", function()
		{
		if(debug)
			console.log("DNS " + type + " server is listening at " + address + ":" + port);
		});

	server.on("error", function(err, buff, req, res)
		{
		if(debug)
			console.log(err.stack);
		});

	server.on("socketError", function(err, socket)
		{
		if(debug)
			console.log(err.stack);
		});

	if(address)
		server.serve(port, address);
	else
		server.serve(port);
	}

var makeRequest = function(question, response)
	{
	var req = dns.Request(
		{
		question: question,
		server: { address: options.external_dns, port: 53, type: "udp" },
		try_edns: true,
		timeout: 1000/*,
		cache: false*/
		});

	req.on("message", function(err, answer)
		{
		if(answer.answer.length > 0)
			{
			answer.answer.forEach(function(a)
				{
				response.answer.push(a);
				});
			}

		if(answer.authority.length > 0)
			{
			answer.authority.forEach(function(a)
				{
				response.authority.push(a);
				});
			}

		if(answer.additional.length > 0)
			{
			answer.additional.forEach(function(a)
				{
				response.additional.push(a);
				});
			}

		if(	options.default_ip &&
			answer.answer.length > 0 &&
			answer.authority.length > 0 &&
			answer.additional.length > 0)																				// dns failed, return defaults
			{
			response.answer.push(dns.A({
				//name: options.default_hostname,
				name: question.name,
				type: dns.consts.nameToQtype("A"),
				//type: dns.consts.nameToQtype("CNAME"),
				class: 1,
				address: options.default_ip,
				ttl: options.ttl}));
			}

		if(debug)
			{
			console.log();
			console.log("QUESTION: " + question.name + " " + dns.consts.qtypeToName(question.type));
			console.log("ANSWERS: " + response.answer.length);
			if(response.answer.length > 0)
				{
				for(i=0; i<response.answer.length; i++)
					console.log(" => " + response.answer[i].address + " ttl: " + response.answer[i].ttl);
				}

			console.log("AUTHORITY: " + response.authority.length);
			if(response.authority.length > 0)
				{
				for(i=0; i<response.authority.length; i++)
					{
					var auth = " => ";
					var obj = response.authority[i];
					auth += obj.primary + " " + obj. admin + " " + obj.serial + " " + obj.refresh + " " + obj.retry + " " + obj.expiration + " " + obj.minimum;
					console.log(auth);
					}
				}

			console.log("ADDITIONAL: " + response.additional.length);
			/*if(response.additional.length > 0)
				{
				for(i=0; i<response.additional.length; i++)
					console.log(" => " + response.additional[i].address);
				}*/
			}

		response.send();
		});

	req.on("timeout", function()
		{
		// Timeout in making request
		});

	req.on("end", function()
		{
		// Finished processing request
		});

	req.send();
	}

var sendLocalURL = function(response, name, type, dclass, ttl, address)
	{
	response.answer.push(dns.A({
		name: name,
		type: type,
		class: dclass,
		ttl: ttl,
		address: address}));
	response.send();
	}

}

module.exports = DNSServer;
