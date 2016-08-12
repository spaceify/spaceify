"use strict";

/**
 * Spaceify main, 2.9.2013 Spaceify Oy
 *
 * @class Main
 */

var fibrous = require("fibrous");
var Core = require("./core");
var Iptables = require("./iptables");
var Logger = require("./logger");
var SpaceifyConfig = require("./spaceifyconfig");

function Main()
{
var self = this;

var core = new Core();
var logger = new Logger();
var config = new SpaceifyConfig();

self.start = fibrous( function()
	{
	var iptables;

	process.title = "spaceify";																		// Shown in ps aux

	events();																						// Exit gracefully

	logger.setOptions({labels: logger.ERROR});														// Show only error labels

	try	{
		// START CORE RUNNING - CORE LISTENS ALL THE SUPPORTED SERVER TYPES
		core.sync.connect();

		// RESTORE IPTABLES RULES
		iptables = new Iptables();
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
		logger.error(err, true, true, logger.ERROR);
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
		logger.error(err, true, true, logger.ERROR);

	fibrous.run( function(err)
		{
		try {
			core.sync.close();

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
