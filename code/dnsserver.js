"use strict";

/**
 * DNSServer, 22.10.2014 Spaceify Oy
 * 
 * @class DNSServer
 */

var dns = require("./lib/native-dns");
var Netmask = require("./lib/netmask").Netmask

function DNSServer()
{
var self = this;

var options = {};
var serverUDP4 = null;
var serverUDP6 = null;
var serverTCP4 = null;
var serverTCP6 = null;

var questions = [];
var processingQuestion = false;
var events = require('events');
var eventEmitter = new events.EventEmitter()

self.connect = function(opts)
	{
	options.port = opts.port || 53;
	options.v4_address = opts.v4_address || null;
	options.v6_address = opts.v6_address || null;
	options.url2ip = opts.url2ip || {};
	options.ttl = opts.ttl || 0;
	options.external_dns = opts.external_dns;
	options.default_response = opts.default_response || null;
	options.debug = ("debug" in opts ? opts.debug : false);

	// -- --
	eventEmitter.on("processQuestions", processQuestions);

	// -- --
	serverUDP4 = dns.createUDPServer({type: "udp4", reuseAddr: true});
	startServer(serverUDP4, options.port, options.v4_address, "udp4");

	serverTCP4 = dns.createTCPServer({type: "tcp4", reuseAddr: true});
	startServer(serverTCP4, options.port, options.v4_address, "tcp4");

	serverUDP6 = dns.createUDPServer({type: "udp6", reuseAddr: true});
	startServer(serverUDP6, options.port, options.v6_address, "udp6");

	//serverTCP6 = dns.createTCPServer({type: "tcp6", reuseAddr: true});
	//startServer(serverTCP6, options.port, options.v6_address, "tcp6");
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
		for(var i = 0; i < request.question.length; i++)
			questions.push({question: request.question[i], response: response});

		eventEmitter.emit("processQuestions");
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

var processQuestions = function()
	{ // Process the questions in the order they arrive
	var name;
	var question;
	var response;
	var question;
	
	if(!processingQuestion && questions.length > 0)
		{
		processingQuestion = true;

		question = questions.shift();
		response = question.response;
		question = question.question;
		name = question.name;

		if(name in options.url2ip)											// Redirect URLs straight to IPs without requesting them from extrenal DNS
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

			processingQuestion = false;
			processQuestions();
			}
		else
			ask(question, response);
		}
	}

var ask = function(question, response)
	{
	var i, r;
	var cname;
	var answer;

	if(options.debug)
		console.log("QUESTION:", question.name, dns.consts.qtypeToName(question.type), "\n");

	var request = dns.Request(
		{
		question: question,
		server: options.external_dns,
		try_edns: true,
		timeout: 1000
		//, cache: false
		});

	request.on("message", function(err, answers)
		{
		cname = null;
		answer = null;

		for(i = 0; i < answers.answer.length; i++)
			{
			answer = answers.answer[i];

			if(/*!cname && */answer.type == 5)
				cname = {name: answer.data, type: question.type, class: question.class};
			else
				response.answer.push(answer);
			}

		if(response.answer.length > 0)										// Error? Sometimes CNAME and other records are send together.
			cname = null;													// Answer with the other records.

		if(options.debug)
			debug(response, question.name, question.type, dns.consts.qtypeToName(question.type));

		for(i = 0; i < answers.authority.length; i++)
			response.authority.push(answers.authority[i]);

		for(i = 0; i < answers.additional.length; i++)
			response.additional.push(answers.additional[i]);

		if(cname)															// Start new request
			ask(cname, response);
		else																// Return response
			{
			if(	answers.answer.length == 0 &&									// If DNS request fails return the default response
				answers.authority.length == 0 &&
				answers.additional.length == 0 &&
				options.default_response &&
				options.default_response.type == question.type)
				{
				response.answer.push(dns.A({
					name: question.name,
					type: options.default_response.type,
					class: options.default_response.class,
					address: options.default_response.ip,
					ttl: options.ttl}));
				}

			response.send();												// lib/packet.js::send()

			processingQuestion = false;
			processQuestions();
			}
		});

	request.on("timeout", function()
		{
		// Timeout in making the request
		//if(options.debug)
		//	console.log("Timeout in making the request");
		});

	request.on("end", function()
		{
		// Finished processing the request
		r = request.question;
		//if(options.debug)
		//	console.log("FINISHED PROCESSING REQUEST:", r.name, "TYPE:", r.type, "NAME:", dns.consts.qtypeToName(r.type), "\n");
		});

	request.send();
	}

var debug = function(response, question_name, type, type_name)
	{
	var i;

	// DEBUG - DEBUG - DEBUG -- -- -- -- -- -- -- -- -- -- //
	if(options.debug)
		{
		console.log("RESPONSE FOR:", question_name, "TYPE:", type, "NAME:", type_name)

		console.log("ANSWERS: " + response.answer.length);
		for(i = 0; i < response.answer.length; i++)
			console.log(" <=", JSON.stringify(response.answer[i]));

		console.log("AUTHORITY: " + response.authority.length);
		for(i = 0; i < response.authority.length; i++)
			console.log(" <=", JSON.stringify(response.authority[i]));

		console.log("ADDITIONAL: " + response.additional.length);
		for(i = 0; i < response.additional.length; i++)
			console.log(" <=", JSON.stringify(response.additional[i]));
		}
	// DEBUG - DEBUG - DEBUG -- -- -- -- -- -- -- -- -- -- //
	}

}

module.exports = DNSServer;
