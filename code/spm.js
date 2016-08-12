"use strict";

/**
 * Spaceify Package Manager, 30.4.2014 Spaceify Oy
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
var Logger = require("./logger");
var language = require("./language");
var Messaging = require("./messaging");
var SpaceifyError = require("./spaceifyerror");
var SecurityModel = require("./securitymodel");
var SpaceifyConfig = require("./spaceifyconfig");
var SpaceifyUtility = require("./spaceifyutility");
var EdgeSpaceifyNet = require("./edgespaceifynet");
var ApplicationManager = require("./applicationmanager");
var WebSocketConnection = require("./websocketconnection.js");
var WebSocketRpcConnection = require("./websocketrpcconnection");

function SPM()
{
var self = this;

var messaging = new Messaging();
var errorc = new SpaceifyError();
var config = new SpaceifyConfig();
var utility = new SpaceifyUtility();
var securityModel = new SecurityModel();
var edgeSpaceifyNet = new EdgeSpaceifyNet();

var exitCode = 0;
var appManConnection = null;
var appManMessageConnection = null;

var applicationManager = new ApplicationManager();

// Update commands and options also to command completion script data/spmc!!!
var INSTALL = "install";
var PUBLISH = "publish";
var SOURCE = "source";
var REMOVE = "remove";
var START = "start";
var STOP = "stop";
var RESTART = "restart";
var LIST = "list";
var STATES = "states";
var REGISTER = "register";
var HELP = "help";
var VERSION = "version";
var STATUS = "status";

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
var FORC  = "force";
var FORC_ = "-f";

var EMPTY = "empty";

var commands = INSTALL + "|" + PUBLISH + "|" + SOURCE + "|" + REMOVE + "|" + START + "|" + STOP + "|" + RESTART + "|" + LIST + "|" + STATES + "|" + REGISTER + "|" + HELP + "|" + VERSION + "|" + STATUS;
var operRegex = new RegExp("^(" + commands + ")$");
var options = AUTH + "|" + SPAC + "|" + SAND + "|" + NATI + "|" + VERB + "|" + FORC;
var optsRegex = new RegExp("^(" + options + ")$");

var p = "│";                    // pipe
var ps = "│ ";                  // pipe space
var all = "└──";                // angle left left
var sall = " └──";              // space angle left left
var smlt = " ├─┬";              // space middle left tee
var mlt = "├─┬";                // middle left tee
var smlt = " ├─┬";              // space middle left tee

var alt = "└─┬";                // angle left tee
var salt = " └─┬";              // space angle left tee

var mll = "├──";                // middle left left
var smll = " ├──";              // space middle left left

var al = "└─";                  // angle left
var ml = "├─";                  // middle left
var tee = "┬";                  // tee
var left = "─";                 // left
var angle = "└";                // angle
var middle = "├";               // middle

var key = config.SPACEIFY_TLS_PATH + config.SERVER_KEY;
var crt = config.SPACEIFY_TLS_PATH + config.SERVER_CRT;
var caCrt = config.SPACEIFY_WWW_PATH + config.SPACEIFY_CRT;

var messageId;
var sessionId = null;

var manualDisconnection = false;

self.start = fibrous( function()
	{
	var arg;
	var auth;
	var cwd = "";
	var last = "";
	var type = [];
	var command = "";
	var force = false;
	var username = "";
	var password = "";
	var openMessaging;
	var verbose = false;
	var githubUsername = "";
	var githubPassword = "";
	var authenticate = false;
	var applicationPackage = "";
	var l, length = process.argv.length;
	var versions = fs.sync.readFile(config.SPACEIFY_PATH + config.VERSIONS, {encoding: "utf8"});

	versions = versions.split(":");

	try {
		// CHECK INPUT (node path/spm.js command ...)
		if(length < 4)
			process.argv.push(EMPTY);

		if(process.argv[3].search(operRegex) == -1 && process.argv[3] != EMPTY)
			throw language.E_SPM_UNKNOWN_COMMAND.preFmt("spm::start", {"~command": process.argv[3]});

		for(var i = 4; i < length; i++)															// options are always after the command
			{
			arg = process.argv[i];

			if(arg == AUTH || arg == AUTH_)
				authenticate = true;
			else if(arg == VERB || arg == VERB_)
				verbose = true;
			else if(arg == FORC || arg == FORC_)
				force = true;
			else if(arg == SPAC || arg == SPAC_ || arg == SAND || arg == SAND_ || arg == NATI ||  arg == NATI_)
				{
				if(type.indexOf(arg) == -1)
					type.push(arg);
				}
			}

		cwd = process.argv[2];
		command = process.argv[3];
		last = process.argv[length - 1];
		applicationPackage = (command != HELP && command != LIST && command != STATES && command != STATUS && command != VERSION ? last : "");	// application package is the last argument
																				// Check argument count for commands
		if( (/*command == INSTALL || */command == PUBLISH || command == PUBLISH) && (length < (5 + (authenticate ? 1 : 0))) )
			throw language.E_SPM_ARGUMENTS_TWO.preFmt("ApplicationManager::start", {"~command": command});

		if(command == INSTALL && length == 4)													// CWD/application
			applicationPackage = "";

		if( (command == REMOVE || command == START || command == STOP || command == RESTART) && length < 5 )
			throw language.E_SPM_ARGUMENTS_ONE.preFmt("ApplicationManager::start", {"~command": command});

		// PRINT TITLE
		logger.force("Spaceify Package Manager v" + versions[4] + " - " + (command != EMPTY ? command : HELP) + "\n");

		// OPTIONS
		if((authenticate && (command == INSTALL || command == SOURCE)) || command == PUBLISH)	// Authenticate to Spaceify registry
			{
			auth = (command == PUBLISH ? config.REGISTRY_HOSTNAME : applicationPackage);

			logger.force(utility.replace(language.AUTHENTICATION, {"~auth": auth}));
			username = read.sync({ prompt: language.USERNAME });
			password = read.sync({ prompt: language.PASSWORD, silent: true, replace: "" });
			}

		if(command == PUBLISH && applicationPackage.match("github.com"))						// Authenticate also to GitHub repository
			{
			logger.force(utility.replace(language.AUTHENTICATION, {"~auth": config.GITHUB_HOSTNAME}));
			githubUsername = read.sync({ prompt: language.USERNAME });
			githubPassword = read.sync({ prompt: language.PASSWORD, silent: true, replace: "" });
			}

		// CONNECTIONS
		if(command != PUBLISH && command != HELP && command != VERSION)
			{
			openMessaging = (command != STATUS ? true : false);

			connect.sync(openMessaging);														// Try to open required connections
			}

		// DO THE REQUESTED COMMAND
		if(command == INSTALL)
			install.sync(applicationPackage, username, password, cwd, force);
		else if(command == REMOVE)
			remove.sync(applicationPackage);
		else if(command == START)
			start.sync(applicationPackage);
		else if(command == STOP)
			stop.sync(applicationPackage);
		else if(command == RESTART)
			restart.sync(applicationPackage);
		else if(command == SOURCE)
			source.sync(applicationPackage, username, password, cwd);
		else if(command == LIST)
			{
			manualDisconnection = true;
			list.sync(type, verbose);
			}
		else if(command == STATES)
			{
			manualDisconnection = true;
			getServiceRuntimeStates.sync();
			}
		else if(command == REGISTER)
			register.sync(type, verbose);
		else if(command == STATUS)
			systemStatus.sync();
		else if(command == PUBLISH)
			publish.sync(applicationPackage, username, password, githubUsername, githubPassword, cwd);
		else if(command == HELP || command == EMPTY)
			help.sync(command == HELP ? true : false, (length > 4 ? last : ""));
		else if(command == VERSION)
			version.sync();
		}
	catch(err)
		{
		logger.error(err, false, false, logger.FORCE);
		}
	finally
		{
		disconnect();
		}
	});

var connect = fibrous( function(openMessaging)
	{
	try {
		// Create temporary log in session
		sessionId = securityModel.sync.createTemporarySession("127.0.0.1");												// Remember to destory the id

		// ApplicationManager
		appManConnection = new WebSocketRpcConnection();
		appManConnection.sync.connect({hostname: config.CONNECTION_HOSTNAME, port: config.APPMAN_PORT_SECURE, isSecure: true, caCrt: caCrt, debug: false});

		// Messaging (Setup by ApplicationManager)
		if(openMessaging)
			{
			appManMessageConnection = new WebSocketConnection();
			appManMessageConnection.setEventListener(self);
			appManMessageConnection.sync.connect({hostname: config.CONNECTION_HOSTNAME, port: config.APPMAN_MESSAGE_PORT_SECURE, isSecure: true, caCrt: caCrt, debug: false});

			messageId = appManConnection.sync.callRpc("requestMessages", [sessionId], self);								// Request a messageId
			appManMessageConnection.send(JSON.stringify({type: messaging.MESSAGE_CONFIRM, messageId: messageId}));			// Confirm that we are listening
			}
		}
	catch(err)
		{
		throw language.E_SPM_CONNECTION_FAILED.pre("ApplicationManager::connectApplicationManager");
		}
	});

var disconnect = function()
	{
	if(appManConnection)
		appManConnection.close();

	if(appManMessageConnection)
		appManMessageConnection.close();

	securityModel.sync.destroyTemporarySession();

	appManConnection = null;
	appManMessageConnection = null;

	logger.force();

	process.exit(exitCode);
	}

	// appManMessageConnection -- -- -- -- -- -- -- -- -- -- //
	// +++
	// EventListener interface implementation (onMessage and onDisconnected events originate from connection)
self.onMessage = function(message, self)
	{
	try {
		message = utility.parseJSON(message);

		if(message.type == messaging.MESSAGE)
			logger.force(message.message);
		else if(message.type == messaging.MESSAGE_ERROR)
			logger.force(message.data.message);
		else if(message.type == messaging.MESSAGE_WARNING)
			logger.force(message.data.message);
		else if(message.type == messaging.MESSAGE_NOTIFY)
			logger.force("\n", message.data.message, "\n");
		else if(message.type == messaging.MESSAGE_QUESTION)
			question(message);
		else if(message.type == messaging.MESSAGE_TIMED_OUT)
			questionTimedOut(message);
		else if(message.type == messaging.MESSAGE_END && !manualDisconnection)
			disconnect();
		}
	catch(err)
		{}
	}

self.onDisconnected = function(id)
	{};

var question = function(message)
	{
	var prompt = "";															// The question and valid answers
	var answers = [];
	
	for(var i = 0; i < message.choices.length; i++)
		{
		prompt += (prompt != "" ? " / " : "") + message.choices[i].screen;
		answers.push(message.choices[i].long, message.choices[i].short);
		}

	if(message.origin == applicationManager.INSTALL_APPLICATION)
		installApplicationQuestion(message, answers, prompt);
	}

var installApplicationQuestion = function(message, answers, prompt)
	{
	read({ prompt: message.message + " (" + prompt + ")" }, function(error, result, isDefault)
		{
		if(answers.indexOf(result) == -1)										// Answer must be one of the choices
			installApplication(message, answers, prompt);
		else
			appManMessageConnection.send(JSON.stringify({type: messaging.MESSAGE_ANSWER, messageId: messageId, answer: result, answerCallBackId: message.answerCallBackId}));
		});
	}

var questionTimedOut = function(message)
	{
	if(message.origin == applicationManager.INSTALL_APPLICATION)
		logger.force("\n", message.message);
	}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// COMMANDS // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
var help = fibrous( function(bVerbose, command)
	{
	var spmCommand;
	var spmCommands;
	var spmHelpFile = fs.sync.readFile(config.DOCS_PATH + config.SPM_HELP, {encoding: "utf8"}), spmParts, help = "";

	if(command == "")
		{
		spmParts = spmHelpFile.split(/@verbose/);

		help = spmParts[0];

		if(bVerbose)
			{
			spmCommands = spmParts[1].split(/%%.*/);

			for(var i = 0; i < spmCommands.length; i++)
				help += spmCommands[i].replace(/%.+?%/, "");
			}
		}
	else
		{
		spmCommand = spmHelpFile.match(new RegExp("%" + command + "%(.|\n|\r)+?%%"));
		if(spmCommand)
			help = spmCommand[0].replace(new RegExp("%" + command + "%"), "");
		help = help.replace(/%/g, "");
		}

	help = help.substring(3);
	logger.force(help);

	disconnect();
	});

var version = fibrous( function()
	{
	var versionFile = fs.sync.readFile(config.VERSION_FILE, {encoding: "utf8"});
	var spmParts = versionFile.split(":");

	logger.force(spmParts[0] + ":", "v" + spmParts[1], spmParts[2]);
	logger.force(spmParts[3] + ":", "v" + spmParts[4]);
	logger.force(spmParts[5] + ":", "v" + spmParts[6]);
	logger.force(spmParts[7] + ":", "v" + spmParts[8], "\n");
	});
	
var install = fibrous( function(applicationPackage, username, password, cwd, force)
	{
	var result = appManConnection.sync.callRpc("installApplication", [applicationPackage, username, password, cwd, force, sessionId], self);
	exitCode = (result == applicationManager.SUCCESS ? 0 : 1);
	});

var remove = fibrous( function(unique_name)
	{
	appManConnection.sync.callRpc("removeApplication", [unique_name, sessionId], self);
	});

var start = fibrous( function(unique_name)
	{
	appManConnection.sync.callRpc("startApplication", [unique_name, sessionId], self);
	});

var stop = fibrous( function(unique_name)
	{
	appManConnection.sync.callRpc("stopApplication", [unique_name, sessionId], self);
	});

var restart = fibrous( function(unique_name)
	{
	appManConnection.sync.callRpc("restartApplication", [unique_name, sessionId], self);
	});

var source = fibrous( function(applicationPackage, username, password, cwd)
	{
	appManConnection.sync.callRpc("sourceCode", [applicationPackage, username, password, cwd], self);
	});

var list = fibrous( function(type, bVerbose)
	{
	var i, j;
	var bLast;
	var injfil;
	var manifest;
	var path = "";
	var continues;
	var spaceletHeader = false;
	var sandboxedHeader = false;
	var nativeHeader = false;

	var dbApps = appManConnection.sync.callRpc("getApplications", [type], self);

	if(dbApps.length == 0)
		logger.force(language.NO_APPLICATIONS);
	else
		{
		for(i = 0; i < dbApps.length; i++)
			{
			if(dbApps[i].type == config.SPACELET && !spaceletHeader)
				{ logger.force(language.INSTALLED_HEADERS[0]); spaceletHeader = true; }
			else if(dbApps[i].type == config.SANDBOXED && !sandboxedHeader)
				{ logger.force(language.INSTALLED_HEADERS[1]); sandboxedHeader = true; }
			else if(dbApps[i].type == config.NATIVE && !nativeHeader)
				{ logger.force(language.INSTALLED_HEADERS[2]); nativeHeader = true; }

			bLast = (i == dbApps.length - 1 || (i < dbApps.length - 1 && dbApps[i].type != dbApps[i + 1].type));

			logger.force(p);

			logger.force((bLast ? al : ml) + (bVerbose ? tee : left), dbApps[i].unique_name + config.PACKAGE_DELIMITER + dbApps[i].version);

			if(bVerbose)
				{
				if(dbApps[i].type == config.SPACELET)
					path = config.SPACELETS_PATH;
				else if(dbApps[i].type == config.SANDBOXED)
					path = config.SANDBOXED_PATH;
				else if(dbApps[i].type == config.NATIVE)
					path = config.NATIVE_PATH;

				manifest = utility.sync.loadJSON(path + dbApps[i].unique_directory + config.APPLICATION_PATH + config.MANIFEST, true);

				continues = (bLast ? "  " + mll : p + smll);

				logger.force(continues, language.M_NAME + manifest.name);

				logger.force(continues, language.M_CATEGORY + utility.ucfirst(manifest.category));

				if(manifest.type == config.SPACELET)
					{
					logger.force(continues, language.M_SHARED + (manifest.shared ? language.M_YES : language.M_NO));

					logger.force((bLast ? "  " + mlt : p + smlt), language.M_INJECT);

					logger.force((bLast ? "  " + p + smll : ps + p + smll), language.M_INJECT_ENABLED + (dbApps[i].inject_enabled ? language.M_YES : language.M_NO));

					logger.force((bLast ? "  " + p + smlt : ps + p + smlt), language.M_ORIGINS);
					for(j = 0; j < manifest.inject_hostnames.length; j++)
						logger.force((bLast ? "  " : ps) + (j < manifest.origins.length - 1 ? ps + p + smll : ps + p + sall), manifest.origins[j]);

					logger.force((bLast ? "  " + p + smll : ps + p + smll), language.M_INJECT_IDENTIFIER + manifest.inject_identifier);

					logger.force((bLast ? "  " + p + smlt : ps + p + smlt), language.M_INJECT_HOSTNAMES);
					for(j = 0; j < manifest.inject_hostnames.length; j++)
						logger.force((bLast ? "  " : ps) + (j < manifest.inject_hostnames.length - 1 ? ps + p  + smll : ps + p + sall), manifest.inject_hostnames[j]);

					logger.force((bLast ? "  " + p + salt :  ps + p + salt), language.M_INJECT_FILES);
					for(j = 0; j < manifest.inject_files.length; j++)
						{
						injfil = (manifest.inject_files[j].directory ? manifest.inject_files[j].directory + "/" : "") + manifest.inject_files[j].file + ", " + manifest.inject_files[j].type;
						logger.force((bLast ? "  " :  ps) + (j < manifest.inject_files.length - 1 ? p + "   " + mll : p + "   " + all), injfil);
						}
					}

				if(manifest.start_command)
					logger.force(continues, language.M_START_COMMAND + manifest.start_command);

				if(manifest.stop_command)
					logger.force(continues, language.M_STOP_COMMAND + manifest.stop_command);

				if(manifest.docker_image)
					logger.force(continues, language.M_DOCKER_IMAGE + (manifest.docker_image ? language.M_YES : language.M_NO));

				if(manifest.install_commands)
					{
					logger.force((bLast ? "  " : ps) + mlt, language.M_INSTALL_COMMANDS);
					for(j = 0; j < manifest.install_commands.length; j++)
						logger.force((bLast ? "  " : ps) + ps + (j < manifest.install_commands.length - 1 ? mll : all), manifest.install_commands[j].file);
					}

				if(manifest.implements)
					logger.force(continues, language.M_IMPLEMENTS + manifest.implements);

				if(manifest.short_description)
					logger.force(continues, language.M_SHORT_DESCRIPTION + manifest.short_description);

				if(manifest.key_words)
					{
					logger.force((bLast ? "  " : ps) + mlt, language.M_KEY_WORDS);
					for(j = 0; j < manifest.key_words.length; j++)
						logger.force((bLast ? "  " : ps) + ps + (j < manifest.key_words.length - 1 ? mll : all), manifest.key_words[j].file);
					}

				if(manifest.license)
					logger.force(continues, language.M_LICENSE + manifest.license);

				if(manifest.repository)
					logger.force(continues, language.M_REPOSITORY + manifest.repository);

				if(manifest.web_url)
					logger.force(continues, language.M_WEB_URL + manifest.web_url);

				if(manifest.bugs)
					logger.force(continues, language.M_BUGS + manifest.bugs);

				if(manifest.developer)
					logger.force(continues, language.M_DEVELOPER + manifest.developer.name + (manifest.developer.email ? " <" + manifest.developer.email + ">" : "") + (manifest.developer.url ? ", " + manifest.developer.url : ""));

				if(manifest.contributors)
					{
					logger.force((bLast ? "  " : ps) + (bRS ? mlt : alt), language.M_CONTRIBUTORS);
					for(j = 0; j < manifest.contributors.length; j++)
						logger.force((bLast ? "  " : ps) + (bRS ? ps : "  ") + (j < manifest.contributors.length - 1 ? mll : all), manifest.contributors[j].name + (manifest.contributors[j].email ? " <" + manifest.contributors[j].email + ">" : "") + (manifest.contributors[j].url ? ", " + manifest.contributors[j].url : ""));
					}

				if(manifest.creation_date)
					logger.force(continues, language.M_CREATION_DATE + manifest.creation_date);

				if(manifest.publish_date)
					logger.force(continues, language.M_PUBLISH_DATE + manifest.publish_date);

				if(manifest.install_datetime)
					logger.force(continues, language.M_INSTALLATION_DATE + dbApps[i].install_datetime);

				if(manifest.images)
					{
					logger.force((bLast ? "  " : ps) + mlt, language.M_IMAGES);
					for(j = 0; j < manifest.images.length; j++)
						logger.force((bLast ? "  " : ps) + ps + (j < manifest.images.length - 1 ? mll : all), (manifest.images[j].directory ? manifest.images[j].directory + "/" : "") + manifest.images[j].file + (manifest.images[j].title ? ", " + manifest.images[j].title : ""));
					}

				if(manifest.provides_services)
					{
					logger.force((bLast ? "  " : ps) + mlt, language.M_PROVIDES_SERVICES);
					for(j = 0; j < manifest.provides_services.length; j++)
						logger.force((bLast ? "  " : ps) + ps + (j < manifest.provides_services.length - 1 ? mll : all), manifest.provides_services[j].service_name + ", " + manifest.provides_services[j].service_type);
					}

				if(manifest.requires_services)
					{
					logger.force((bLast ? "  " : ps) + mlt, language.M_REQUIRES_SERVICES);
					for(j = 0; j < manifest.requires_services.length; j++)
						logger.force((bLast ? "  " : ps) + ps + (j < manifest.requires_services.length - 1 ? mll : all), manifest.requires_services[j].service_name);
					}

				// Is running
				logger.force((bLast ? "  " : ps) + all + language.M_IS_RUNNING + (dbApps[i].isRunning ? language.M_YES : language.M_NO));
				}
			}
		}

	disconnect();
	});

var getServiceRuntimeStates = fibrous( function()
	{
	var services;
	var unique_names;
	var applications;
	var lastService;
	var isLastService;
	var lastApplication;
	var isLastApplication;
	var applicationCount = 0;
	var states = appManConnection.sync.callRpc("getServiceRuntimeStates", [sessionId], self);

	for(var type in states)
		{
		unique_names = Object.keys(states[type]);

		if(unique_names.length > 0)
			logger.force(language.RUNNING_HEADERS[config.APP_TYPE_NUMBER[type]]);

		applications = states[type];
		applicationCount += unique_names.length;
		for(var n = 0; n < unique_names.length; n++)
			{
			isLastApplication = (n + 1 == unique_names.length ? true : false);
			lastApplication = (!isLastApplication ? p : " ");

			logger.force(p);
			logger.force((isLastApplication ? alt : mlt), unique_names[n]);

			services = applications[unique_names[n]];
			for(var s = 0; s < services.length; s++)
				{
				isLastService = (s + 1 == services.length ? true : false);
				lastService = (!isLastService ? p : " ");

				logger.force(lastApplication, (!isLastService ? mlt : alt), services[s].service_name);

				logger.force(lastApplication, lastService, mll, language.M_TYPE, services[s].service_type);
				logger.force(lastApplication, lastService, mll, language.M_PORT, services[s].port, "->", services[s].containerPort);
				logger.force(lastApplication, lastService, mll, language.M_SECURE_PORT, services[s].securePort, "->", services[s].secureContainerPort);
				logger.force(lastApplication, lastService, mll, language.M_IP, services[s].ip);
				logger.force(lastApplication, lastService, all, language.M_IS_REGISTERED, (services[s].isRegistered ? language.M_YES : language.M_NO));
				}
			}
		}

	if(applicationCount == 0)
		logger.force(language.NO_RUNNING_APPLICATIONS);

	disconnect();
	});

var publish = fibrous( function(applicationPackage, username, password, githubUsername, githubPassword, cwd)
	{
	applicationManager.sync.publishPackage(applicationPackage, username, password, githubUsername, githubPassword, cwd);

	disconnect();
	});

var register = fibrous( function()
	{
	try {
		edgeSpaceifyNet.sync.createEdgeId(true);

		logger.force(errorc.replace(language.I_SPM_REGISTER_SUCCESSFUL, {"~registration": config.SPACEIFY_REGISTRATION_FILE}));
		}
	catch(err)
		{		
		logger.force(errorc.replace(language.E_SPM_REGISTER_FAILED, {"~message": err.message}));
		}

	disconnect();
	});

var systemStatus = fibrous( function()
	{
	var lines = "";
	var result = appManConnection.sync.callRpc("systemStatus", [], self);

	for(var i in result)
		lines += i + "=" + result[i] + "\n";

	console.log(lines);											// Clients expect to get the results through their stdin!!!
	});

}

var logger = new Logger();

fibrous.run( function()
	{
	//logger.setOptions({labels: logger.ERROR, levels: logger.ERROR});

	var spm = new SPM();
	spm.sync.start();
	}, function(err, data) { } );
