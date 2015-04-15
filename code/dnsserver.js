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
	options.external_dns = opts.external_dns;
	options.default_response = opts.default_response || null;
	options.debug = opts.debug || false;

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

		if(name in options.url2ip)														// Redirect URLs straight to IPs without requesting them from extrenal DNS
			{
			response.answer.push(dns.A(
				{
				name: name,
				type: question.type,
				ttl: options.url2ip[name].ttl,
				address: options.url2ip[name].ip,
				class: options.url2ip[name].class
				}));
				response.send();
			}
		else																						
			makeRequest(question, response);
		});

	server.on("listening", function()
		{
		if(options.debug)
			console.log("DNS " + type + " server is listening at " + address + ":" + port);
		});

	server.on("error", function(err, buff, req, res)
		{
		if(options.debug)
			console.log(err.stack);
		});

	server.on("socketError", function(err, socket)
		{
		if(options.debug)
			console.log(err.stack);
		});

	if(address)
		server.serve(port, address);
	else
		server.serve(port);
	}

var makeRequest = function(question, response)
	{
	var query_restarted = false;

	var request = dns.Request(
		{
		question: question,
		server: options.external_dns,
		try_edns: true,
		timeout: 1000/*,
		cache: false*/
		});

	request.on("message", function(err, answers)
		{
		for(var i=0; i<answers.answer.length; i++)
			{
			var a = answers.answer[i];

			if(a.type == 5)																// If answer is a CNAME record, restart the query with the new name
				{
				query_restarted = true;
				makeRequest({name: a.data, type: question.type, class: question.class}, response);
				break;
				}
			else
				response.answer.push(a);
			}

		for(var i=0; i<answers.authority.length; i++)
			{
			var a = answers.authority[i];
			response.authority.push(a);
			}

		for(var i=0; i<answers.additional.length; i++)
			{
			var a = answers.additional[i];
			response.additional.push(a);
			}

		if(	options.default_response &&
			dns.consts.nameToQtype(options.default_response.type) == question.type &&
			answers.answer.length == 0 &&
			answers.authority.length == 0 &&
			answers.additional.length == 0)												// If DNS request fails return the default response
			{
			response.answer.push(dns.A({
				name: question.name,
				type: dns.consts.nameToQtype(options.default_response.type),
				class: options.default_response.class,
				address: options.default_response.ip,
				ttl: options.ttl}));
			}

		if(options.debug)
			{
			console.log();
			console.log("QUESTION: " + question.name + " " + dns.consts.qtypeToName(question.type));

			console.log("ANSWERS: " + response.answer.length);
			for(i=0; i<response.answer.length; i++)
				console.log(" => " + response.answer[i].address + " class: " + response.answer[i].class + " ttl: " + response.answer[i].ttl);

			console.log("AUTHORITY: " + response.authority.length);
			for(i=0; i<response.authority.length; i++)
				console.log(" => " + response.authority[i].data + " class: " + response.authority[i].class + " ttl: " + response.authority[i].ttl);

			console.log("ADDITIONAL: " + response.additional.length);
			/*for(i=0; i<response.additional.length; i++)
				console.log(" => " + response.additional[i].address);*/
			}

		if(!query_restarted)															// CNAME was not returned
			response.send();
		});

	request.on("timeout", function()
		{
		// Timeout in making the request
		});

	request.on("end", function()
		{
		// Finished processing the request
		});

	request.send();
	}

}

module.exports = DNSServer;
