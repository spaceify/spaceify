#!/usr/bin/env node
/**
 * Spaceify main, 2.9.2013 Spaceify Inc.
 * 
 */

var fs = require("fs");
var fibrous = require("fibrous");
var logger = require("./logger");
var Config = require("./config")();
var Database = require("./database");
var Iptables = require("./iptables");
var WebServer = require("./webserver");
var MainEvents = require("./mainevents");
var AppManager = require("./appmanager");
var SpaceifyCore = require("./spaceifycore");

var database = new Database();
var httpServer = new WebServer();
var httpsServer = new WebServer();
var appManager = new AppManager();
var spaceifyCore = new SpaceifyCore();
var mainEvents = new MainEvents(spaceifyCore, appManager, httpServer, httpsServer);

// // // // // // // // // // // // // // // // // // // // // // // // //
// Start proxy, Spaceify core and applications  // // // // // // // // //
var start = fibrous( function()
	{
	logger.setOptions({labels: logger.ERROR});																// Show labels for errors only

	try	{
		database.open(Config.SPACEIFY_DATABASE_FILEPATH);
		var settings = database.sync.getSettings();

		var key = fs.sync.readFile(Config.SSL_PATH_KEY);
		var cert = fs.sync.readFile(Config.SSL_PATH_CERT);
		httpServer.connect.sync({hostname: null, port: Config.EDGE_PORT_HTTP, core: spaceifyCore, spaceifyClient: true, owner: "main"});
		httpsServer.connect.sync({hostname: null, port: Config.EDGE_PORT_HTTPS, isSsl: true, sslKey: key, sslCert: cert, core: spaceifyCore, spaceifyClient: true, owner: "main"});

//console.log(require("./utility").sync.loadRemoteFile("https://edge.spaceify.net/index.html", true).body);

		spaceifyCore.sync.connect({hostname: null, webSocketPorts: {"http": Config.CORE_PORT_WEBSOCKET, "https": Config.CORE_PORT_WEBSOCKET_SECURE}, socketPorts: {"http": Config.CORE_PORT_SOCKET, "https": Config.CORE_PORT_SOCKET_SECURE}});

		appManager.sync.connect({hostname: null, ports: {"http": Config.APPMAN_PORT_WEBSOCKET, "https": Config.APPMAN_PORT_WEBSOCKET_SECURE}, core: spaceifyCore});

		spaceifyCore.sync.startApplications();

		try { spaceifyCore.sync.loginToSpaceifyNet("login"); } catch(err) { logger.warn(err); }

		/*var uid = parseInt(process.env.SUDO_UID);						// No more super user rights
		if(uid)
			process.setuid(uid);*/

		var iptables = new Iptables();																		// Restore iptables rules
		iptables.sync.splashRestoreRules();
		}
	catch(err)
		{
		mainEvents.exit(err);
		}
	finally
		{
		database.close();
		}
	});

fibrous.run(function()
	{
	start.sync();
	});

// // // // // // // // // // // // // // // // // // // // // // // // //
// Exit gracefully   // // // // // // // // // // // // // // // // // //
/*process.stdin.resume();
process.stdin.setEncoding("utf8");
process.stdin.setRawMode(true);
process.stdin.on("data", function(key)
	{
	if(key == "c" || key == "q" || key == "x")
		mainEvents.exit();
	});*/

process.on("uncaughtException", function(err)
	{
	logger.error(err.stack);
	mainEvents.exit(err);
	});

process.on("SIGHUP", function()
	{
	mainEvents.exit();
	});

process.on("SIGTERM", function()
	{
	mainEvents.exit();
	});

process.on("SIGINT", function()
	{
	mainEvents.exit();
	});

process.on("exit", function()
	{
	mainEvents.exit();
	});
