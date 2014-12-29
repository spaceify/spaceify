#!/usr/bin/env node
/**
 * Spaceify main events, 7.11.2013 Spaceify Inc.
 *
 *  A class to handle events that affect the Spaceify Core
 * 
 * @class MainEvents
 */

var fibrous = require("fibrous");
var EventEmitter = require("events").EventEmitter;
var logger = require("./logger");
var Utility = require("./utility");
var Language = require("./language");

function MainEvents(spaceifyCore, appManager, httpServer, httpsServer)
{
var self = this;

var emitter = new EventEmitter();

var exitCalled = false;

emitter.on("exit", function(err)
	{	
	if(err)
		{
		Utility.printErrors(err);
		logger.info(err.stack);
		}

	fibrous.run(function()
		{
		try {
			appManager.sync.close();

			spaceifyCore.sync.close();
			}
		catch(err) {}

		if(httpServer)
			httpServer.sync.close();

		if(httpsServer)
			httpsServer.sync.close();

		try { spaceifyCore.sync.loginToSpaceifyNet("logout"); } catch(err) {}

		exitCalled = true;

		process.exit();
		}, function(err) { });
	});

self.exit = function(err)
	{
	if(!exitCalled)
		emitter.emit("exit", err);
	}
}

module.exports = MainEvents;
