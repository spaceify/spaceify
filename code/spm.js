#!/usr/bin/env node
/**
 * Spaceify Package Manager, 30.4.2014 Spaceify Inc.
 * 
 * @file spm-js
 * 
 * #/usr/bin/spm
 */

var fs = require("fs");
var read = require("read");
var http = require("http");
var qs = require("querystring");
var fibrous = require("fibrous");
var logger = require("./logger");
var Config = require("./config")();
var Utility = require("./utility");
var Language = require("./language");
var AppManager = require("./appmanager");
var AppManagerRPCClient = require("./websocketrpcclient");
var SpmRPCServer = require("./websocketrpcserver");

function SPM()
{
var self = this;

var spmRPCServer = null;
var appManagerRPCClient = null;
var appManager = new AppManager();

var INSTALL = "install";
var REMOVE = "remove";
var START = "start";
var STOP = "stop";
var RESTART = "restart";
var PUBLISH = "publish";
var SOURCE = "source";
var LIST = "list";
var HELP = "help";
var QUICKHELP = "quickhelp";
var AUTHENTICATE = "authenticate";
var SPACELET = "spacelet";
var SANDBOXED = "sandboxed";
var NATIVE = "native";
var VERBOSE = "verbose";

var commands = INSTALL+"|"+REMOVE+"|"+START+"|"+STOP+"|"+RESTART+"|"+PUBLISH+"|"+SOURCE+"|"+LIST+"|"+HELP;
var oper_regex = new RegExp("^(" + commands + ")$");
var options = AUTHENTICATE+"|"+SPACELET+"|"+SANDBOXED+"|"+NATIVE+"|"+VERBOSE;
var opts_regex = new RegExp("^(" + options + ")$");

self.start = fibrous( function()
	{
	var command = "";
	var package = "";
	var authenticate = false;
	var type = [];
	var verbose = false;
	var username = "";
	var password = "";
	var github_username = "";
	var github_password = "";

	logger.force();
	logger.force("Spaceify Package Manager v" + Config.SPM_VERSION);

	try {
		// CHECK INPUT (node ..path/spm.js command ...)
		if(process.argv.length < 3)
			process.argv.push(QUICKHELP);//throw Utility.ferror(Language.E_WRONG_NUMBER_OF_ARGUMENTS.p("SPM::start()"), {":commands": commands, ":options": options});

		command = process.argv[2].trim();																// command is always the third argument
		if(command.search(oper_regex) == -1 && command != QUICKHELP)
			throw Utility.ferror(Language.E_UNKNOW_COMMAND.p("SPM::start()"), {":command": command, ":commands": commands});

		if((command != HELP && command != QUICKHELP && command != LIST) && process.argv.length < 4)		// help and list do not need options or package name
			throw Utility.ferror(Language.E_WRONG_NUMBER_OF_ARGUMENTS.p("SPM::start()"), {":commands": commands, ":options": options});

		for(var i=3; i<process.argv.length; i++)														// options are always after $>spm command, ignore if not recognized as an option
			{
			if(process.argv[i] == AUTHENTICATE)
				authenticate = true;

			if(process.argv[i] == SPACELET || process.argv[i] == SANDBOXED || process.argv[i] == NATIVE)
				{
				if(type.indexOf(process.argv[i]) == -1)
					type.push(process.argv[i]);
				}

			if(process.argv[i] == VERBOSE)
				verbose = true;
			}

		if(command != HELP && command != LIST)
			package = process.argv[process.argv.length - 1].trim();								// package is the last argument

		// OPTIONS		  
		if((authenticate && (command == INSTALL || command == SOURCE)) || command == PUBLISH)	// Authenticate Spaceify registry
			{
			var auth_host = "";
			if(command == INSTALL)
				auth_host = package;
			else if(command == PUBLISH || command == SOURCE)
				auth_host = Config.REGISTRY_HOSTNAME;

			logger.force(Utility.replace(Language.AUTHENTICATION, {":auth_host": auth_host}));
			username = read.sync({ prompt: Language.USERNAME });
			password = read.sync({ prompt: Language.PASSWORD, silent: true, replace: "*" });
			}

		if(authenticate && command == PUBLISH)													// Authenticate GitHub repository
			{
			logger.force(Utility.replace(Language.AUTHENTICATION, {":auth_host": Config.GITHUB_HOSTNAME}));
			github_username = read.sync({ prompt: Language.USERNAME });
			github_password = read.sync({ prompt: Language.PASSWORD, silent: true, replace: "*" });
			}

		// DO THE REQUESTED COMMAND
		if(command != QUICKHELP)
			logger.force(Utility.ucfirst(command) + " " + package);
		logger.force();

		openSPMServer.sync();																	// Open a WebSocket server for relaying messages from the running AppManager

		connectToAppManager.sync();																// Try to open a JSON-RPC connection to the AppManager

		if(command == INSTALL)
			install.sync(package, username, password);
		else if(command == PUBLISH)
			publish.sync(package, username, password, github_username, github_password);
		else if(command == SOURCE)
			source.sync(package, username, password);
		else if(command == REMOVE)
			remove.sync(package);
		else if(command == START)
			start.sync(package);
		else if(command == STOP)
			stop.sync(package);
		else if(command == RESTART)
			restart.sync(package);
		else if(command == LIST)
			list.sync(type, verbose);
		else if(command == HELP || command == QUICKHELP)
			help.sync(command == HELP ? true : false);
		}
	catch(err)
		{
		Utility.printErrors(err);
		}
	finally
		{
		disconnectFromAppManager();
		closeSPMServer();
		}
	});

var connectToAppManager = fibrous( function()
	{
	try {
		appManagerRPCClient = new AppManagerRPCClient();
		appManagerRPCClient.sync.connect({hostname: null, port: Config.APPMAN_PORT_WEBSOCKET, persistent: true, owner: "spm"});
		}
	catch(err)
		{
		appManagerRPCClient = null;
		}
	});

var disconnectFromAppManager = function()
	{
	if(appManagerRPCClient)
		appManagerRPCClient.close();
	appManagerRPCClient = null;
	}

var openSPMServer = fibrous( function()
	{
	try {
		spmRPCServer = new SpmRPCServer();
		spmRPCServer.exposeMethod("messages", self, self.messages);
		spmRPCServer.connect.sync({hostname: null, port: Config.SPM_PORT_WEBSOCKET, owner: "spm"});
		}
	catch(err)
		{
		spmRPCServer = null;
		}
	});

var closeSPMServer = function()
	{
	if(spmRPCServer != null)
		spmRPCServer.sync.close();
	spmRPCServer = null;
	}

self.messages = fibrous( function(message, literal)
	{
	logger.force(message, null, literal);
	});

// COMMANDS // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
var help = fibrous( function(bVerbose)
	{
	var spm_help = fs.sync.readFile(Config.SPACEIFY_DATA_PATH + "docs/spm.help", {encoding: "utf8"})
	var spm_parts = spm_help.split(/@verbose/);
	logger.force(spm_parts[0] + (bVerbose ? spm_parts[1] : ""));
	});

var install = fibrous( function(package, username, password)
	{
	package = splitPackageName(package);
	var packages = [package[0]];
	var versions = [package[1] || null];

	for(var i=0; i<packages.length; i++)
		{
		if(appManagerRPCClient == null)
			suggested_applications = appManager.sync.installApplication(packages[i] + (versions[i] ? Config.PACKAGE_DELIMITER + versions[i] : ""), (i == 0 ? false : true), username, password);
		else
			suggested_applications = appManagerRPCClient.sync.call("installApplication", [packages[i], (i == 0 ? false : true), username, password, true], self);

		logger.force();

		for(var j=0; j<suggested_applications.length; j++)
			{
			var app = splitPackageName(suggested_applications[j]);

			if(packages.indexOf(app[0]) == -1)										// Install suggested applications only once
				{
				packages.push(app[0]);
				versions.push(app[1] || null);
				}
			}
		}
	});

var publish = fibrous( function(package, username, password, github_username, github_password)
	{
	appManager.sync.publishPackage(package, username, password, github_username, github_password);
	});

var source = fibrous( function(package, username, password)
	{
	appManager.sync.sourceCode(package, username, password);
	});

var remove = fibrous( function(unique_name)
	{
	if(appManagerRPCClient == null)
		appManager.sync.removeApplication(unique_name);
	else
		appManagerRPCClient.sync.call("removeApplication", [unique_name, true], self);
	});

var start = fibrous( function(unique_name)
	{
	if(appManagerRPCClient == null)
		appManager.sync.startApplication(unique_name);
	else
		appManagerRPCClient.sync.call("startApplication", [unique_name, true], self);
	});

var stop = fibrous( function(unique_name)
	{
	if(appManagerRPCClient == null)
		appManager.sync.stopApplication(unique_name);
	else
		appManagerRPCClient.sync.call("stopApplication", [unique_name, true], self);
	});

var restart = fibrous( function(unique_name)
	{
	if(appManagerRPCClient == null)
		appManager.sync.restartApplication(unique_name);
	else
		appManagerRPCClient.sync.call("restartApplication", [unique_name, true], self);
	});

var list = fibrous( function(type, bVerbose)
	{
	var path = "";
	var spaceletHeader = false;
	var sandboxedHeader = false;
	var nativeHeader = false;

	if(appManagerRPCClient == null)
		apps = appManager.sync.listApplications(type);
	else
		apps = appManagerRPCClient.sync.call("listApplications", [type], self);

	if(apps.length == 0)
		logger.force(Language.NO_APPLICATIONS);
	else
		{
		for(var i=0; i<apps.length; i++)
			{
			if(apps[i].type == Config.SPACELET && !spaceletHeader)
				{ logger.force(Language.INSTALLED_SPACELETS); spaceletHeader = true; }
			else if(apps[i].type == Config.SANDBOXED_APPLICATION && !sandboxedHeader)
				{ logger.force(Language.INSTALLED_SANDBOXED); sandboxedHeader = true; }
			else if(apps[i].type == Config.NATIVE_APPLICATION && !nativeHeader)
				{ logger.force(Language.INSTALLED_NATIVE); nativeHeader = true; }

			var bLast = (i == apps.length - 1 || (i < apps.length - 1 && apps[i].type != apps[i + 1].type));

			logger.force((bLast ? "└─" : "├─") + (bVerbose ? "┬ " : "─ ") + apps[i].unique_name + Config.PACKAGE_DELIMITER + apps[i].version);

			if(bVerbose)
				{
				if(apps[i].type == Config.SPACELET)
					path = Config.SPACELETS_PATH;
				else if(apps[i].type == Config.SANDBOXED_APPLICATION)
					path = Config.SANDBOXED_PATH;
				else if(apps[i].type == Config.NATIVE_APPLICATION)
					path = Config.NATIVE_PATH;

				var manifest = Utility.sync.loadManifest(path + apps[i].unique_directory + Config.APPLICATION_PATH + Config.MANIFEST, true);

				logger.force((bLast ? "  ├── " : "│ ├── ") + Language.M_NAME + manifest.name);

				logger.force((bLast ? "  ├── " : "│ ├── ") + Language.M_CATEGORY + Utility.ucfirst(manifest.category));

				if(manifest.type == Config.SPACELET)
					{
					logger.force((bLast ? "  ├── " : "│ ├── ") + Language.M_SHARED + (manifest.shared ? Language.M_YES : Language.M_NO));

					logger.force((bLast ? "  ├─┬ " : "│ ├─┬ ") + Language.M_INJECT);

					logger.force((bLast ? "  │ ├── " : "│ │ ├── ") + Language.M_INJECT_ENABLED + (apps[i].inject_enabled ? Language.M_YES : Language.M_NO));

					logger.force((bLast ? "  │ ├── " : "│ │ ├── ") + Language.M_INJECT_IDENTIFIER + manifest.inject_identifier);

					logger.force((bLast ? "  │ ├─┬ " : "│ │ ├─┬ ") + Language.M_INJECT_HOSTNAMES);
					for(var j=0; j<manifest.inject_hostnames.length; j++)
						logger.force((bLast ? "  " : "│ ") + (j < manifest.inject_hostnames.length - 1 ? "│ │ ├── " : "│ │ └── ") + manifest.inject_hostnames[j]);

					logger.force((bLast ? "  │ └─┬ " : "│ │ └─┬ ") + Language.M_INJECT_FILES);
					for(var j=0; j<manifest.inject_files.length; j++)
						{
						var injfil = (manifest.inject_files[j].directory ? manifest.inject_files[j].directory + "/" : "") + manifest.inject_files[j].name + ", " + manifest.inject_files[j].type;
						logger.force((bLast ? "  " : "│ ") + (j < manifest.inject_files.length - 1 ? "│   ├── " : "│   └── ") + injfil);
						}
					}

				if(manifest.developer)
					logger.force((bLast ? "  ├── " : "│ ├── ") + Language.M_DEVELOPER + manifest.developer.name + (manifest.developer.email ? " <" + manifest.developer.email + ">" : "") + (manifest.developer.url ? ", " + manifest.developer.url : ""));

				if(manifest.contributors)
					{
					logger.force((bLast ? "  " : "│ ") + (bRS ? "├─┬ " : "└─┬ ") + Language.M_CONTRIBUTORS);
					for(var j=0; j<manifest.contributors.length; j++)
						logger.force((bLast ? "  " : "│ ") + (bRS ? "│ " : "  ") + (j < manifest.contributors.length - 1 ? "├── " : "└── ") + manifest.contributors[j].name + (manifest.contributors[j].email ? " <" + manifest.contributors[j].email + ">" : "") + (manifest.contributors[j].url ? ", " + manifest.contributors[j].url : ""));
					}

				if(manifest.creation_date)
					logger.force((bLast ? "  ├── " : "│ ├── ") + Language.M_CREATION_DATE + manifest.creation_date);

				if(manifest.publish_date)
					logger.force((bLast ? "  ├── " : "│ ├── ") + Language.M_PUBLISH_DATE + manifest.publish_date);

				logger.force((bLast ? "  ├── " : "│ ├── ") + Language.M_INSTALLATION_DATE + apps[i].install_datetime);

				var bRS = (manifest.requires_services ? true : false);
				logger.force((bLast ? "  " : "│ ") + (bRS ? "├─┬ " : "└─┬ ") + Language.M_PROVIDES_SERVICES);
				for(var j=0; j<manifest.provides_services.length; j++)
					logger.force((bLast ? "  " : "│ ") + (bRS ? "│ " : "  ") + (j < manifest.provides_services.length - 1 ? "├── " : "└── ") + manifest.provides_services[j].service_name + ", " + manifest.provides_services[j].service_type);
				if(bRS)
					{
					logger.force((bLast ? "  └─┬ " : "│ └─┬ ") + Language.M_REQUIRES_SERVICES);
					for(var j=0; j<manifest.requires_services.length; j++)
						logger.force((bLast ? "    " : "│   ") + (j < manifest.requires_services.length - 1 ? "├── " : "└── ") + manifest.requires_services[j].service_name + ", " + manifest.requires_services[j].service_type);
					}
				}

			if(bLast)
				logger.force();
			}
		}
	});

	// UTILITY
var splitPackageName = function(package)
	{
	return package.split(Config.PACKAGE_DELIMITER);
	}
	
}

fibrous.run(function()
	{
	logger.setOptions({labels: logger.ERROR, levels: logger.ERROR});
	var spm = new SPM();
	spm.sync.start();
	});
