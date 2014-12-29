#!/usr/bin/env node
/**
 * DNSServer, 22.10.2014 Spaceify Inc.
 * 
 * @class DNSServer
 */

var dns = require("native-dns");
var Config = require("./config")();

function DNSServer()
{
var self = this;

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
	options.external_dns = options.external_dns || "8.8.8.8";

	serverUDP4 = dns.createServer({dgram_type: "udp4"});
	serverUDP6 = dns.createServer({dgram_type: "udp6"});
	//serverTCP4 = dns.createTCPServer({dgram_type: "udp4"});
	//serverTCP6 = dns.createTCPServer({dgram_type: "udp6"});

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

		//console.log("DNS: " + name + " " + dns.consts.qtypeToName(type));

		if(name in options.url2ip /*&& type == 1*/)																		// URLs to local IPs, IPv4 only
			{
			response.answer.push(dns.A({
				name: name,
				type: type,
				class: 1,
				ttl: options.url2ip[name].ttl,
				address: options.url2ip[name].ip}));
			response.send();
			}
		else
			makeQuestion(question, response);
		});

	server.on("listening", function()
		{
		console.log("DNS " + type + " server is listening at " + address + ":" + port);
		});

	server.on("error", function(err, buff, req, res)
		{
		console.log(err.stack);
		});

	server.on("socketError", function(err, socket)
		{
		console.log(err.stack);
		});

	if(address)
		server.serve(port, address);
	else
		server.serve(port);
	}

var makeQuestion = function(question, response)
	{
	var req = dns.Request(
		{
		question: question,
		server: { address: options.external_dns, port: 53, type: "udp" },
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

}

module.exports = DNSServer;
