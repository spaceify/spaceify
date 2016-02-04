#!/usr/bin/env node
/**
 * Spaceify main, 2.9.2013 Spaceify Inc.
 *
 * @class Main
 */

var fibrous = require("fibrous");
var Core = require("./core");
var Server = require("./server");
var logger = require("./www/libs/logger");
var config = require("./config")();
var utility = require("./utility");
var Iptables = require("./iptables");

function Main()
{
var self = this;

var core = new Core();

var owner = "Main";

self.start = fibrous( function()
	{
	process.title = "spaceify";																		// Shown in ps aux

	events();																						// Exit gracefully

	logger.setOptions({labels: logger.ERROR});														// Show only error labels

	try	{
		// START CORE RUNNING - CORE LISTENS ALL THE SUPPORTED SERVER TYPES
		var servers = {};
		servers[config.WEBSOCKET_S]		= {server: new Server(config.WEBSOCKETRPCS), "port": config.CORE_PORT_WEBSOCKET, "is_secure": false};
		servers[config.WEBSOCKET_SS]	= {server: new Server(config.WEBSOCKETRPCS), "port": config.CORE_PORT_WEBSOCKET_SECURE, "is_secure": true};
		servers[config.ENGINE_IO_S]		= {server: new Server(config.ENGINEIORPCS), "port": config.CORE_PORT_ENGINEIO, "is_secure": false};
		servers[config.ENGINE_IO_SS]	= {server: new Server(config.ENGINEIORPCS), "port": config.CORE_PORT_ENGINEIO_SECURE, "is_secure": true};

		core.sync.connect({hostname: null, servers: servers});

		// ---
		// ToDO: enable - try { core.sync.loginToSpaceifyNet("login"); } catch(err) { logger.warn(err); }

		// RESTORE IPTABLES RULES
		var iptables = new Iptables();
		iptables.sync.splashRestoreRules();
		}
	catch(err)
		{
		exit(err);
		}
	});

var events = function()
	{
	process.on("uncaughtException", function(err)
		{
		logger.printErrors(err, true, true, 0);
		exit();
		})

	process.on("SIGHUP", function()
		{
		exit();
		})

	process.on("SIGTERM", function()
		{
		exit();
		})

	process.on("SIGINT", function()
		{
		exit();
		})

	process.on("exit", function(code)
		{
		})
	}

var exit = function(err)
	{
	if(err)
		logger.printErrors(err, true, true, 0);

	fibrous.run( function(err)
		{
		try
			{
			core.sync.close();

			// ToDO: enable - try { core.sync.loginToSpaceifyNet("logout"); } catch(err) {}

			process.exit(0);
			}
		catch(err)
			{}		
		}, function(err, data) { } );
	}

}

fibrous.run( function()
	{
	var main = new Main();
	main.start.sync();
	}, function(err, data) { } );