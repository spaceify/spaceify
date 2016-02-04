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
var crypto = require("crypto");
var qs = require("querystring");
var fibrous = require("fibrous");
var logger = require("./www/libs/logger");
var config = require("./config")();
var utility = require("./utility");
var language = require("./language");
var SecurityModel = require("./securitymodel");
var Communicator = require("./www/libs/communicator");
var ApplicationManager = require("./applicationmanager");

function SPM()
{
var self = this;

var appManConnection = null;
var appManMessageConnection = null;
var communicator = new Communicator();
var securityModel = new SecurityModel();

// Update commands and options also to command completion script data/spmc!!!
var INSTALL = "install";
var PUBLISH = "publish";
var SOURCE = "source";
var REMOVE = "remove";
var START = "start";
var STOP = "stop";
var RESTART = "restart";
var LIST = "list";
var REGISTER = "register";
var HELP = "help";

var AUTH  = "authenticate";
var AUTH_ = "-a";
var SPAC  = "spacelet";
var SPAC_ = "-s";
var SAND  = "sandboxed";
var SAND_ = "-S";
var NATI  = "native";
var NATI_ = "-n";
var VERB  = "verbose";
var VERB_ = "-v";

var EMPTY = "empty";

var commands = INSTALL + "|" + PUBLISH + "|" + SOURCE + "|" + REMOVE + "|" + START + "|" + STOP + "|" + RESTART + "|" + LIST + "|" + REGISTER + "|" + HELP;
var oper_regex = new RegExp("^(" + commands + ")$");
var options = AUTH+"|"+SPAC+"|"+SAND+"|"+NATI+"|"+VERB;
var opts_regex = new RegExp("^(" + options + ")$");

var key = config.SPACEIFY_TLS_PATH + config.SERVER_KEY;
var crt = config.SPACEIFY_TLS_PATH + config.SERVER_CRT;
var ca_crt = config.SPACEIFY_WWW_PATH + config.SPACEIFY_CRT;

self.start = fibrous( function()
	{	
	var cwd = "";
	var command = "", last = "";
	var package = "";
	var authenticate = false;
	var type = [];
	var verbose = false;
	var username = "";
	var password = "";
	var github_username = "";
	var github_password = "";
	var l, length = process.argv.length;

	var versions = fs.sync.readFile(config.SPACEIFY_PATH + config.VERSIONS, {encoding: "utf8"});
	versions = versions.split(":");
	
	try {
		// CHECK INPUT (node path/spm.js command ...)
		if(length < 4)
			process.argv.push(EMPTY);

		if(process.argv[3].search(oper_regex) == -1 && process.argv[3] != EMPTY)
			throw utility.ferror(language.E_SPM_UNKNOWN_COMMAND.p("spm::start"), {":command": process.argv[3]});

		for(var i=4; i<length; i++)																// options are always after the command
			{
			var arg = process.argv[i];

			if(arg == AUTH || arg == AUTH_)
				authenticate = true;
			else if(arg == VERB || arg == VERB_)
				verbose = true;
			else if(arg == SPAC || arg == SPAC_ || arg == SAND || arg == SAND_ || arg == NATI ||  arg == NATI_)
				{
				if(type.indexOf(arg) == -1)
					type.push(arg);
				}
			}

		cwd = process.argv[2];
		command = process.argv[3];
		last = process.argv[length - 1];
		package = (command != HELP && command != LIST ? last : "");								// package is the last argument

																								// Check argument count for commands
		if( (command == INSTALL || command == PUBLISH || command == PUBLISH) && (length < (5 + (authenticate ? 1 : 0))) )
			throw utility.ferror(language.E_SPM_ARGUMENTS_TWO.p("ApplicationManager::start"), {":command": command});

		if( (command == REMOVE || command == START || command == STOP || command == RESTART) && length < 5 )
			throw utility.ferror(language.E_SPM_ARGUMENTS_ONE.p("ApplicationManager::start"), {":command": command});

		// PRINT TITLE
		logger.force("Spaceify Package Manager v" + versions[4] + " - " + (command != EMPTY ? command : HELP) + "\n");

		// OPTIONS
		if((authenticate && (command == INSTALL || command == SOURCE)) || command == PUBLISH)	// Authenticate to Spaceify registry
			{
			var auth = (command == PUBLISH ? config.REGISTRY_HOSTNAME : package);

			logger.force(utility.replace(language.AUTHENTICATION, {":auth": auth}));
			username = read.sync({ prompt: language.USERNAME });
			password = read.sync({ prompt: language.PASSWORD, silent: true, replace: "" });
			}

		if(command == PUBLISH && package.match("github.com"))									// Authenticate also to GitHub repository
			{
			logger.force(utility.replace(language.AUTHENTICATION, {":auth": config.GITHUB_HOSTNAME}));
			github_username = read.sync({ prompt: language.USERNAME });
			github_password = read.sync({ prompt: language.PASSWORD, silent: true, replace: "" });
			}

		// CONNECTIONS
		if(command != PUBLISH && command != HELP)
			connectApplicationManager.sync();													// Try to open a JSON-RPC connections to the ApplicationManager

		// DO THE REQUESTED COMMAND
		if(command == INSTALL)
			install.sync(package, username, password, cwd);
		else if(command == REMOVE)
			remove.sync(package);
		else if(command == START)
			start.sync(package);
		else if(command == STOP)
			stop.sync(package);
		else if(command == RESTART)
			restart.sync(package);
		else if(command == SOURCE)
			source.sync(package, username, password, cwd);
		else if(command == LIST)
			list.sync(type, verbose);
		else if(command == REGISTER)
			register.sync(type, verbose);
		else if(command == PUBLISH)
			publish.sync(package, username, password, github_username, github_password, cwd);
		else if(command == HELP || command == EMPTY)
			help.sync(command == HELP ? true : false, (length > 4 ? last : ""));
		}
	catch(err)
		{
		logger.printErrors(err, false, false, 1);
		logger.force();
		}
	finally
		{
		disconnectApplicationManager();
		process.exit(0);
		}
	});

var connectApplicationManager = fibrous( function()
	{
	try {
		appManConnection = communicator.sync.connect({hostname: null, port: config.APPMAN_PORT_WEBSOCKET_SECURE, is_secure: true, ca_crt: ca_crt, persistent: true, owner: options.owner}, config.WEBSOCKETRPCC);

		var message_id = appManConnection.sync.callRpc("requestMessages", [null, true], self);			// Request a message_id

		appManMessageConnection = communicator.sync.connect({hostname: null, port: config.APPMAN_PORT_WEBSOCKET_MESSAGE_SECURE, is_secure: true, ca_crt: ca_crt, persistent: true, owner: options.owner}, config.WEBSOCKETC);
		appManMessageConnection.setMessageListener(messageListener);

		appManMessageConnection.sendMessage(JSON.stringify({message_id: message_id }));					// Confirm that we are listening
		}
	catch(err)
		{
		if(appManConnection)
			{
			appManConnection.close();
			appManConnection = null;
			}

		if(appManMessageConnection)
			{
			appManMessageConnection.close();
			appManMessageConnection = null;
			}

		throw utility.error(language.E_SPM_CONNECTION_FAILED.p("ApplicationManager::connectApplicationManager"));
		}
	});

var disconnectApplicationManager = function()
	{
	if(appManConnection)
		appManConnection.close();

	if(appManMessageConnection)
		appManMessageConnection.close();

	appManConnection = null;
	appManMessageConnection = null;
	}

var messageListener = function(message)
	{
	try {
		message = utility.parseJSON(message);
		if(message.message != config.END_OF_MESSAGES)
			logger.force(message.message);
		}
	catch(err)
		{}
	}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// COMMANDS // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
var help = fibrous( function(bVerbose, command)
	{
	var spm_help_file = fs.sync.readFile(config.DOCS_PATH + config.SPM_HELP, {encoding: "utf8"}), spm_parts, help = "";

	if(command == "")
		{
		spm_parts = spm_help_file.split(/@verbose/);

		help = spm_parts[0];

		if(bVerbose)
			{
			var spm_commands = spm_parts[1].split(/%%.*/);

			for(var i=0; i<spm_commands.length; i++)
				help += spm_commands[i].replace(/%.+?%/, "");
			}
		}
	else
		{
		var spm_command = spm_help_file.match(new RegExp("%" + command + "%(.|\n|\r)+?%%"));
		if(spm_command)
			help = spm_command[0].replace(new RegExp("%" + command + "%"), "");
		help = help.replace(/%/g, "");
		}

	help = help.substring(3);
	logger.force(help);
	});

var install = fibrous( function(package, username, password, cwd)
	{
	appManConnection.sync.callRpc("installApplication", [package, username, password, cwd, null, true], self);
	});

var remove = fibrous( function(unique_name)
	{
	appManConnection.sync.callRpc("removeApplication", [unique_name, null, true], self);
	});

var start = fibrous( function(unique_name)
	{
	appManConnection.sync.callRpc("startApplication", [unique_name, null, true], self);
	});

var stop = fibrous( function(unique_name)
	{
	appManConnection.sync.callRpc("stopApplication", [unique_name, null, true], self);
	});

var restart = fibrous( function(unique_name)
	{
	appManConnection.sync.callRpc("restartApplication", [unique_name, null, true], self);
	});

var source = fibrous( function(package, username, password, cwd)
	{
	appManConnection.sync.callRpc("sourceCode", [package, username, password, cwd, true], self);
	});

var list = fibrous( function(type, bVerbose)
	{
	var path = "";
	var spaceletHeader = false;
	var sandboxedHeader = false;
	var nativeHeader = false;

	var p = "│";					// pipe
	var ps = "│ ";				// pipe space
	var a = "└";					// angle
	var all = "└──"			// angle left left
	var salls = " └── ";		// space angle left left space
	var alls = "└── ";		// angle left left space
	var smlts = " ├─┬ ";		// space middle (pipe + branch to left) left tee (left + branch down) space
	var mlts = "├─┬ ";		// middle left tee space

	var alts = "└─┬ ";		// angle left tee space
	var salts = " └─┬ ";		// space angle left tee space

	var mlls = "├── ";		// middle left left space
	var smlls = " ├── ";		// space middle left left space

	var al = "└─";	// angle left
	var ml = "├─"; 	// middle left
	var ts = "┬ ";	// tee space
	var ls = "─ "; 		// left space

	apps = appManConnection.sync.callRpc("getApplications", [type], self);

	if(apps.length == 0)
		logger.force(language.NO_APPLICATIONS);
	else
		{
		for(var i=0; i<apps.length; i++)
			{
			if(apps[i].type == config.SPACELET && !spaceletHeader)
				{ logger.force(language.INSTALLED_SPACELETS); spaceletHeader = true; }
			else if(apps[i].type == config.SANDBOXED && !sandboxedHeader)
				{ logger.force(language.INSTALLED_SANDBOXED); sandboxedHeader = true; }
			else if(apps[i].type == config.NATIVE && !nativeHeader)
				{ logger.force(language.INSTALLED_NATIVE); nativeHeader = true; }

			var bLast = (i == apps.length - 1 || (i < apps.length - 1 && apps[i].type != apps[i + 1].type));

			logger.force(p);

			logger.force((bLast ? al : ml) + (bVerbose ? ts : ls) + apps[i].unique_name + config.PACKAGE_DELIMITER + apps[i].version);

			if(bVerbose)
				{
				if(apps[i].type == config.SPACELET)
					path = config.SPACELETS_PATH;
				else if(apps[i].type == config.SANDBOXED)
					path = config.SANDBOXED_PATH;
				else if(apps[i].type == config.NATIVE)
					path = config.NATIVE_PATH;

				var manifest = utility.sync.loadJSON(path + apps[i].unique_directory + config.APPLICATION_PATH + config.MANIFEST, true);

				var continues = (bLast ? "  " + mlls : p + smlls);
				
				logger.force(continues + language.M_NAME + manifest.name);

				logger.force(continues + language.M_CATEGORY + utility.ucfirst(manifest.category));

				if(manifest.type == config.SPACELET)
					{
					logger.force(continues + language.M_SHARED + (manifest.shared ? language.M_YES : language.M_NO));

					logger.force((bLast ? "  " + mlts : p + smlts) + language.M_INJECT);

					logger.force((bLast ? "  " + p + smlls : ps + p + smlls) + language.M_INJECT_ENABLED + (apps[i].inject_enabled ? language.M_YES : language.M_NO));

					logger.force((bLast ? "  " + p + smlts : ps + p + smlts) + language.M_ORIGINS);
					for(var j=0; j<manifest.inject_hostnames.length; j++)
						logger.force((bLast ? "  " : ps) + (j < manifest.origins.length - 1 ? ps + p + smlls : ps + p + salls) + manifest.origins[j]);
					
					logger.force((bLast ? "  " + p + smlls : ps + p + smlls) + language.M_INJECT_IDENTIFIER + manifest.inject_identifier);

					logger.force((bLast ? "  " + p + smlts : ps + p + smlts) + language.M_INJECT_HOSTNAMES);
					for(var j=0; j<manifest.inject_hostnames.length; j++)
						logger.force((bLast ? "  " : ps) + (j < manifest.inject_hostnames.length - 1 ? ps + p  + smlls : ps + p + salls) + manifest.inject_hostnames[j]);

					logger.force((bLast ? "  " + p + salts :  ps + p + salts) + language.M_INJECT_FILES);
					for(var j=0; j<manifest.inject_files.length; j++)
						{
						var injfil = (manifest.inject_files[j].directory ? manifest.inject_files[j].directory + "/" : "") + manifest.inject_files[j].file + ", " + manifest.inject_files[j].type;
						logger.force((bLast ? "  " :  ps) + (j < manifest.inject_files.length - 1 ? p + "   " + mlls : p + "   " + alls) + injfil);
						}
					}

				if(manifest.start_command)
					logger.force(continues + language.M_START_COMMAND + manifest.start_command);

				if(manifest.stop_command)
					logger.force(continues + language.M_STOP_COMMAND + manifest.stop_command);
					

				if(manifest.docker_image)
					logger.force(continues + language.M_DOCKER_IMAGE + (manifest.docker_image ? language.M_YES : language.M_NO));

				if(manifest.install_commands)
					{
					logger.force((bLast ? "  " : ps) + mlts + language.M_INSTALL_COMMANDS);
					for(var j=0; j<manifest.install_commands.length; j++)
						logger.force((bLast ? "  " : ps) + ps + (j < manifest.install_commands.length - 1 ? mlls : alls) + manifest.install_commands[j].file);
					}

				if(manifest.implements)
					logger.force(continues + language.M_IMPLEMENTS + manifest.implements);

				if(manifest.short_description)
					logger.force(continues + language.M_SHORT_DESCRIPTION + manifest.short_description);
					
				if(manifest.key_words)
					{
					logger.force((bLast ? "  " : ps) + mlts + language.M_KEY_WORDS);
					for(var j=0; j<manifest.key_words.length; j++)
						logger.force((bLast ? "  " : ps) + ps + (j < manifest.key_words.length - 1 ? mlls : alls) + manifest.key_words[j].file);
					}

				if(manifest.license)
					logger.force(continues + language.M_LICENSE + manifest.license);

				if(manifest.repository)
					logger.force(continues + language.M_REPOSITORY + manifest.repository);

				if(manifest.web_url)
					logger.force(continues + language.M_WEB_URL + manifest.web_url);

				if(manifest.bugs)
					logger.force(continues + language.M_BUGS + manifest.bugs);

				if(manifest.developer)
					logger.force(continues + language.M_DEVELOPER + manifest.developer.name + (manifest.developer.email ? " <" + manifest.developer.email + ">" : "") + (manifest.developer.url ? ", " + manifest.developer.url : ""));

				if(manifest.contributors)
					{
					logger.force((bLast ? "  " : ps) + (bRS ? mlts : alts) + language.M_CONTRIBUTORS);
					for(var j=0; j<manifest.contributors.length; j++)
						logger.force((bLast ? "  " : ps) + (bRS ? ps : "  ") + (j < manifest.contributors.length - 1 ? mlls : alls) + manifest.contributors[j].name + (manifest.contributors[j].email ? " <" + manifest.contributors[j].email + ">" : "") + (manifest.contributors[j].url ? ", " + manifest.contributors[j].url : ""));
					}

				if(manifest.creation_date)
					logger.force(continues + language.M_CREATION_DATE + manifest.creation_date);

				if(manifest.publish_date)
					logger.force(continues + language.M_PUBLISH_DATE + manifest.publish_date);

				if(manifest.install_datetime)
					logger.force(continues + language.M_INSTALLATION_DATE + apps[i].install_datetime);

				if(manifest.images)
					{
					logger.force((bLast ? "  " : ps) + mlts + language.M_IMAGES);
					for(var j=0; j<manifest.images.length; j++)
						logger.force((bLast ? "  " : ps) + ps + (j < manifest.images.length - 1 ? mlls : alls) + (manifest.images[j].directory ? manifest.images[j].directory + "/" : "") + manifest.images[j].file + (manifest.images[j].title ? ", " + manifest.images[j].title : ""));
					}

				if(manifest.provides_services)
					{
					logger.force((bLast ? "  " : ps) + mlts + language.M_PROVIDES_SERVICES);
					for(var j=0; j<manifest.provides_services.length; j++)
						logger.force((bLast ? "  " : ps) + ps + (j < manifest.provides_services.length - 1 ? mlls : alls) + manifest.provides_services[j].service_name + ", " + manifest.provides_services[j].service_type);
					}

				if(manifest.requires_services)
					{
					logger.force((bLast ? "  " : ps) + mlts + language.M_REQUIRES_SERVICES);
					for(var j=0; j<manifest.requires_services.length; j++)
						logger.force((bLast ? "  " : ps) + ps + (j < manifest.requires_services.length - 1 ? mlls : alls) + manifest.requires_services[j].service_name + ", " + manifest.requires_services[j].service_type);
					}

				// Is running
				logger.force((bLast ? "  " : ps) + all + language.M_IS_RUNNING + (apps[i].is_running ? language.M_YES : language.M_NO));
				}

			if(bLast)
				logger.force();
			}
		}
	});

var publish = fibrous( function(package, username, password, github_username, github_password, cwd)
	{
	var appman = new ApplicationManager();
	appman.sync.publishPackage(package, username, password, github_username, github_password, cwd);
	});

var register = fibrous( function()
	{
	var appman = new ApplicationManager();
	appman.sync.register();
	});

}

fibrous.run( function()
	{
	logger.setOptions({labels: logger.ERROR, levels: logger.ERROR});

	var spm = new SPM();
	spm.sync.start();
	}, function(err, data) { } );
