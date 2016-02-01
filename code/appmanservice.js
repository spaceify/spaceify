/**
 * Application Manager service, 12.5.2015, Spaceify Inc.
 * 
 */

var fibrous = require("fibrous");
var logger = require("./logger");
var config = require("./config")();
var utility = require("./utility");
var ApplicationManager = require("./applicationmanager");

fibrous.run( function()
	{
	process.title = "spaceifyappman";																// Shown in ps aux

	try {
		var applicationManager = new ApplicationManager();

		// SETUP A RPC SERVER FOR APPLICATION MANAGER
		applicationManager.sync.connect();
		}
	catch(err)
		{
		logger.printErrors(err, true, true, 0);
		}
	}, function(err, data) { } );