/**
 * ApplicationManager, 9.1.2014, Spaceify Inc.
 * 
 * @class ApplicationManager
 */

// INCLUDES
var fs = require("fs");
var url = require("url");
var http = require("http");
var crypto = require("crypto");
var mkdirp = require("mkdirp");
var Github = require("github");
var AdmZip = require("adm-zip");
var fibrous = require("fibrous");
var logger = require("./logger");
var config = require("./config")();
var utility = require("./utility");
var language = require("./language");
var Database = require("./database");
var http_status = require("./httpstatus");
var Application = require("./application");
var SecurityModel = require("./securitymodel");
var DockerImage = require("./dockerimage.js");
var DockerContainer = require("./dockercontainer.js");
var WebSocketServer = require("./websocketserver");
var WebSocketRPCServer = require("./websocketrpcserver");
var WebSocketRPCConnection = require("./websocketrpcconnection");
var ValidateApplication = require("./validateapplication");

function ApplicationManager()
{
var self = this;

var options = {};
var is_locked = false;
var database = new Database();
var coreClient = null;
var RPCServer = new WebSocketRPCServer();
var messageServer = new WebSocketServer();

var securityModel = new SecurityModel();

var key = config.SPACEIFY_TLS_PATH + config.SERVER_KEY;
var crt = config.SPACEIFY_TLS_PATH + config.SERVER_CRT;
var ca_crt = config.SPACEIFY_WWW_PATH + config.SPACEIFY_CRT;

var hostname = null;
var owner = "ApplicationManager";

var carbage_interval_id;
var carbage_interval = 60000;

var messageids = {};
var connectionids = {};

self.connect = fibrous( function(opts)
	{
	// Set listeners - keep servers and connections to external resources open
	RPCServer.setServerDownListener(RPCServerDownListener);
	RPCServer.setAccessListener(RPCServerAccessListener);
	RPCServer.setConnectionListener(RPCServerConnectionListener);
	RPCServer.setDisconnectionListener(RPCServerDisconnectionListener);

	messageServer.setServerDownListener(messageServerDownListener);
	messageServer.setConnectionListener(messageServerConnectionListener);
	messageServer.setDisconnectionListener(messageServerDisconnectionListener);
	messageServer.setMessageListener(messageServerMessageListener);

	// Expose RPC nethods
	RPCServer.exposeRpcMethod("installApplication", self, installApplication);
	RPCServer.exposeRpcMethod("removeApplication", self, removeApplication);
	RPCServer.exposeRpcMethod("startApplication", self, startApplication);
	RPCServer.exposeRpcMethod("stopApplication", self, stopApplication);
	RPCServer.exposeRpcMethod("restartApplication", self, restartApplication);
	RPCServer.exposeRpcMethod("getApplications", self, getApplications);
	RPCServer.exposeRpcMethod("sourceCode", self, sourceCode);
	RPCServer.exposeRpcMethod("requestMessages", self, requestMessages);
	//RPCServer.exposeRpcMethod("publishPackage", self, publishPackage);

	// Connect - secure servers only!!!
	connectRPCServer.sync();

	connectMessageServer.sync();

	// Setup a connection to the core
	connectToCore.sync();

	// Setup carbage collection
	carbage_interval_id = setInterval(carbageCollection, carbage_interval);
	});

var connectRPCServer = fibrous( function()
	{
	RPCServer.connect.sync({hostname: hostname, port: config.APPMAN_PORT_WEBSOCKET_SECURE, is_secure: true, key: key, crt: crt, ca_crt: ca_crt, owner: owner});
	});

var connectMessageServer = fibrous( function()
	{
	messageServer.connect.sync({hostname: hostname, port: config.APPMAN_PORT_WEBSOCKET_MESSAGE_SECURE, is_secure: true, key: key, crt: crt, ca_crt: ca_crt, owner: owner});
	});

var connectToCore = fibrous( function()
	{ // Establishes a connection to cores server
	try {
		coreClient = new WebSocketRPCConnection();
		coreClient.setDisconnectionListener(coreConnectionsListener);

		coreClient.sync.connect({hostname: hostname, port: config.CORE_PORT_WEBSOCKET_SECURE, is_secure: true, ca_crt: ca_crt, persistent: true, owner: owner});
		}
	catch(err)
		{
		coreConnectionsListener(null);
		}
	});

self.close = fibrous( function()
	{
	coreClient.close();

	RPCServer.close();
	messageServer.close();
	
	messageids = {};
	connectionids = {};
	});

var RPCServerDownListener = function(server)
	{
	setTimeout(function()
		{
		fibrous.run( function() { connectRPCServer.sync(); }, function(err, data) { } );
		}, config.RECONNECT_WAIT);
	}

// RPCServerConnectionListener + RPCServerDisconnectionListener + RPCServerAccessListener = allow one connection at a time
var RPCServerConnectionListener = function(server)
	{
	is_locked = true;
	}

var RPCServerDisconnectionListener = function(server)
	{
	is_locked = false;
	}

var RPCServerAccessListener = function(remoteAddress, remotePort, origin, server_type, is_secure, requestedProtocols)
	{
	if(!securityModel.hasRequestedProtocol(requestedProtocols))
		return {message: language.PROTOCOLS_DENIED, granted: false};

	if(!securityModel.isLocalIP(remoteAddress))
		return {message: language.REMOTE_DENIED, granted: false};

	if(is_locked)
		return {message: language.APPMAN_LOCKED, granted: false};

	return {message: "", granted: true};
	}

var messageServerDownListener = function(server)
	{
	messageids = {};
	connectionids = {};

	setTimeout(function(is_secure)
		{
		fibrous.run( function() { connectMessageServer.sync(); }, function(err, data) { } );
		}, config.RECONNECT_WAIT, server.is_secure);
	}

var messageServerConnectionListener = function(connection)
	{ // Monitor connections. Connection is removed  in carbage collection, if it is not accepted in time.
	if(!(connection.id in connectionids))
		connectionids[connection.id] = { timestamp: Date.now() };
	}

var messageServerDisconnectionListener = function(connection)
	{ // Make sure ids are removed
	if(connection.id in connectionids)
		delete connectionids[connection.id];
		
	for(id in messageids)
		{
		if(messageids[id].connection_id == connection.id)
			delete messageids[id];
		}
	}

var messageServerMessageListener = function(message, connection)
	{
	try {
		message = utility.parseJSON(message, true);
		if(!message.message_id) throw "";

		if(message.message_id in messageids)					// The message_id can be paired with a connection, accept the connection
			messageids[message.message_id].connection_id = connection.id;
		else													// There is no message_id for this connection, close the connection
			messageServer.closeConnection(connection.id);

		if(connectionids[connection.id])						// The connection is now processed
			delete connectionids[connection.id];
		}
	catch(err)
		{}
	}

var coreConnectionsListener = function(connection)
	{ // Disconnection and failed connection listener
	setTimeout(function()
		{
		fibrous.run( function() { coreClient = null; connectToCore.sync(); }, function(err, data) { } );
		}, config.RECONNECT_WAIT);
	}

	// EXPOSED JSON-RPC -- -- -- -- -- -- -- -- -- -- //
var installApplication = fibrous( function(package, username, password, cwd, session_id, is_spm)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument

	var packages = [];
	var is_suggested = false;
	var suggested_applications = [];

	try {
		// Preconditions for performing this operation
		if(!checkAuthentication.sync(connobj.remoteAddress, session_id, is_spm))
			throw utility.error(language.E_AUTHENTICATION_FAILED.p("ApplicationManager::installApplication"));

		removeTemporaryFiles.sync();

		// Get current release information
		var settings = database.sync.getSettings();

		// Iterate all the packages: the package and the packages it might require and packages the required packages might require...
		packages.push(package);
		for(var i=0; i<packages.length; i++)
			{ // ---------->

			// Get next package
			package = packages[i];

			// Try to get the package
			var registry_url = config.REGISTRY_INSTALL_URL + "?package=" + package + "&release=" + settings["release_name"] + "&username=" + username + "&password=" + password;
			if(!getPackage.sync(package, is_suggested, true, username, password, registry_url, cwd))
				throw utility.ferror(language.E_FAILED_TO_PROCESS_PACKAGE.p("ApplicationManager::installApplication"), {":package": package});

			// Validate the package for any errors
			sendMessage.sync(language.VALIDATING_PACKAGE);

			var validator = new ValidateApplication();
			var manifest = validator.sync.validatePackage(config.WORK_PATH, config.WORK_PATH + config.APPLICATION_DIRECTORY);

			// Application must not have same service names with already installed applications
			var errors = database.sync.checkProvidedServices(manifest);
			if(errors)
				{
				for(var j=0; j<errors.length; j++)
					sendMessage.sync(utility.replace(language.SERVICE_ALREADY_REGISTERED, {":name": errors[j]["service_name"], ":app": errors[j]["unique_name"]}));

				throw utility.error(language.E_SERVICE_ALREADY_REGISTERED.p("ApplicationManager::installApplication"));
				}

			// Stop existing application if application is running (and is installed)
			if(coreClient.sync.callRpc("isApplicationRunning", [manifest.unique_name], self))
				{
				sendMessage.sync(language.STOPPING_EXISTING_APPLICATION);
				coreClient.sync.callRpc("stopApplication", [manifest.unique_name, false], self);
				}

			// Install the application
			install.sync(manifest);

			// (Re)start the application
			sendMessage.sync(language.STARTING_APPLICATION);
			coreClient.sync.callRpc("startApplication", [manifest.unique_name, false, true], self);

			// Check does the package have suggested applications in required_services.
			if(manifest.requires_services)
				{
				is_suggested = true;
				suggested_applications = [];

				for(var s=0; s<manifest.requires_services.length; s++)								// Get suggested application that meet these criterion
					{
					var required_service = manifest.requires_services[s];
					var existing_service = database.sync.getService(required_service.service_name);

					// ----- No suggested application defined and no registered service by the name found -> this application might not work as intented
					if(required_service.suggested_application == "" && !existing_service)
						sendMessage.sync("", utility.replace(language.REQUIRED_SERVICE_NOT_AVAILABLE, {":name": required_service.service_name, ":url": config.REGISTRY_URL}));

					// ----- No suggested service but registered service name found -> using the existing application/service
					else if(required_service.suggested_application == "" && existing_service)
						sendMessage.sync("", utility.replace(language.REQUIRED_SERVICE_ALREADY_REGISTERED, {":name": existing_service.service_name, ":app": existing_service.unique_name, ":version": existing_service.version}));

					// ----- Suggested application is defined .....
					else
						{
						// .... and service not already registered -> try to install the suggested application
						if(!existing_service)
							{
							sendMessage.sync("", utility.replace(language.REQUIRED_SERVICE_INSTALL_SA, {":name": required_service.service_name, ":app": required_service.suggested_application}));
							suggested_applications.push(required_service.suggested_application);
							}

						// .... but service is already registered -> don't reinstall even if version would changebecause it might make other packages inoperative
						else
							{
							var required_package = required_service.suggested_application.split(config.PACKAGE_DELIMITER);

							// ----- Suggested and installed applications are different -> using the existing application/service
							if(existing_service.unique_name != required_package[0])
								sendMessage.sync("", utility.replace(language.REQUIRED_SERVICE_DIFFERENT_APPS, {":name": required_service.service_name, ":app": existing_service.unique_name, ":version": existing_service.version, ":sapp": required_service.suggested_application}));

							// ----- Suggested application is same as the installed application -> using the existing application@version
							else
								sendMessage.sync("", utility.replace(language.REQUIRED_SERVICE_SAME_APPS, {":name": required_service.service_name, ":app": existing_service.unique_name, ":version": existing_service.version, ":sapp": required_service.suggested_application}));
							}
						}
					}

				for(var j=0; j<suggested_applications.length; j++)									// Install suggested applications. Notice: only once!
					{
					if(packages.indexOf(suggested_applications[j]) == -1)
						packages.push(suggested_applications[j]);
					}
				}

			} // <----------
		}
	catch(err)
		{
		printErrors.sync(err);
		}
	finally
		{
		database.close();
		removeTemporaryFiles.sync();
		sendMessage.sync(config.END_OF_MESSAGES);
		}

	return suggested_applications;
});
	
var removeApplication = fibrous( function(unique_name, session_id, is_spm)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument

	try {
		// Preconditions for performing this operation
		if(!checkAuthentication.sync(connobj.remoteAddress, session_id, is_spm))
			throw utility.error(language.E_AUTHENTICATION_FAILED.p("ApplicationManager::removeApplication"));

		var app_data = database.sync.getApplication([unique_name]);
		if(!app_data)
			throw utility.ferror(language.E_APPLICATION_NOT_INSTALLED.p("ApplicationManager::removeApplication"), {":name": unique_name});

		// Remove the application
		database.sync.begin();
		remove.sync(app_data, false);
		database.sync.commit();

		// Finalize remove
		sendMessage.sync(utility.replace(language.APPLICATION_REMOVED, {":app": unique_name}));
		}
	catch(err)
		{
		database.sync.rollback();

		err = utility.error(err);
		sendMessage.sync((err.messages ? err.messages : err.message));
		}
	finally
		{
		database.close();
		sendMessage.sync(config.END_OF_MESSAGES);
		}

	return true;
	});

var startApplication = fibrous( function(unique_name, session_id, is_spm)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument

	try {
		// Preconditions for performing this operation
		if(!checkAuthentication.sync(connobj.remoteAddress, session_id, is_spm))
			throw utility.error(language.E_AUTHENTICATION_FAILED.p("ApplicationManager::startApplication"));

		var app_data = database.sync.getApplication([unique_name]);
		if(!app_data)
			throw utility.ferror(language.E_APPLICATION_NOT_INSTALLED.p("ApplicationManager::startApplication"), {":name": unique_name});

		// Start the application
		if(coreClient.sync.callRpc("isApplicationRunning", [app_data.unique_name], self))
			sendMessage.sync(utility.replace(language.ALREADY_RUNNING, {":app": app_data.unique_name}));
		else
			{
			sendMessage.sync(language.STARTING_APPLICATION);
			coreClient.sync.callRpc("startApplication", [app_data.unique_name, true, true], self);
			sendMessage.sync(language.APPLICATION_STARTED);
			}
		}
	catch(err)
		{
		sendMessage.sync((err.messages ? err.messages : err.message));
		}
	finally
		{
		database.close();
		sendMessage.sync(config.END_OF_MESSAGES);
		}

	return true;
	});

var stopApplication = fibrous( function(unique_name, session_id, is_spm)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument

	try {
		// Preconditions for performing this operation
		if(!checkAuthentication.sync(connobj.remoteAddress, session_id, is_spm))
			throw utility.error(language.E_AUTHENTICATION_FAILED.p("ApplicationManager::stopApplication"));

		var app_data = database.sync.getApplication([unique_name]);
		if(!app_data)
			throw utility.ferror(language.E_APPLICATION_NOT_INSTALLED.p("ApplicationManager::stopApplication"), {":name": unique_name});

		// Stop the application
		if(!coreClient.sync.callRpc("isApplicationRunning", [app_data.unique_name, "MAL"], self))
			sendMessage.sync(utility.replace(language.ALREADY_STOPPED, {":app": app_data.unique_name}));
		else
			{
			sendMessage.sync(language.STOPPING_APPLICATION);
			coreClient.sync.callRpc("stopApplication", [app_data.unique_name, true], self);
			sendMessage.sync(language.APPLICATION_STOPPED);
			}
		}
	catch(err)
		{
		sendMessage.sync((err.messages ? err.messages : err.message));
		}
	finally
		{
		database.close();
		sendMessage.sync(config.END_OF_MESSAGES);
		}
	});

var restartApplication = fibrous( function(unique_name, session_id, is_spm)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument

	try {
		// Preconditions for performing this operation
		if(!checkAuthentication.sync(connobj.remoteAddress, session_id, is_spm))
			throw utility.error(language.E_AUTHENTICATION_FAILED.p("ApplicationManager::restartApplication"));

		var app_data = database.sync.getApplication([unique_name]);
		if(!app_data)
			throw utility.ferror(language.E_APPLICATION_NOT_INSTALLED.p("ApplicationManager::restartApplication"), {":name": unique_name});

		// Restart the application
		sendMessage.sync(language.STOPPING_APPLICATION);
		coreClient.sync.callRpc("stopApplication", [app_data.unique_name, true], self);

		sendMessage.sync(language.STARTING_APPLICATION);
		coreClient.sync.callRpc("startApplication", [app_data.unique_name, true, true], self);

		sendMessage.sync(language.APPLICATION_RESTARTED);
		}
	catch(err)
		{
		sendMessage.sync((err.messages ? err.messages : err.message));
		}
	finally
		{
		database.close();
		sendMessage.sync(config.END_OF_MESSAGES);
		}

	return true;
	});

var getApplications = fibrous( function(types)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument

	var applications;

	try {
		// Get application data
		applications = database.sync.getApplications(types);

		for(var i=0; i<applications.length; i++)
			applications[i]["is_running"] = coreClient.sync.callRpc("isApplicationRunning", [applications[i].unique_name], self);
		}
	catch(err)
		{
		throw utility.error(language.E_FAILED_TO_LIST_APPLICATIONS.p("ApplicationManager::getApplications"), err);
		}
	finally
		{
		database.close();
		}

	return applications;
	});

var sourceCode = fibrous( function(package, username, password, cwd)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument

	try {
		removeTemporaryFiles.sync();

		// Get current release information
		var settings = database.sync.getSettings();

		// Get sources
		var registry_url = config.REGISTRY_INSTALL_URL + "?package=" + package + "&release=" + settings["release_name"] + "&username=" + username + "&password=" + password;
		if(!getPackage.sync(package, false, false, username, password, registry_url, cwd))
			throw utility.ferror(language.E_FAILED_TO_PROCESS_PACKAGE.p("ApplicationManager::sourceCode"), {":package": package});

		var dest = package.replace(/[^0-9a-zA-Z-_]/g, "_");
		dest = dest.replace(/_{2,}/g, "_");
		dest = dest.replace(/^_*|_*$/g, "");
		dest = cwd + "/" + config.SOURCES_DIRECTORY + dest;

		utility.sync.deleteDirectory(dest);															// Remove previous files
		utility.sync.copyDirectory(config.WORK_PATH, dest);											// Copy files to sources directory

		sendMessage.sync(utility.replace(language.GET_SOURCES_OK, {":directory": dest}));
		}
	catch(err)
		{
		printErrors.sync(err);
		}
	finally
		{
		database.close();
		removeTemporaryFiles.sync();
		sendMessage.sync(config.END_OF_MESSAGES);
		}
	});

var requestMessages = fibrous( function(session_id, is_spm)
	{ // Somebody wants to start following the messages
	  // See methods: messageServerConnectionListener, messageServerDisconnectionListener, messageServerMessageListener, carbageCollection, messages
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument

	var message_id = null;

	try {
		if(!checkAuthentication.sync(connobj.remoteAddress, session_id, is_spm))
			throw utility.error(language.E_AUTHENTICATION_FAILED.p("ApplicationManager::requestMessages"));

		message_id = utility.randomString(64, true);
		messageids[message_id] = { timestamp: Date.now(), connection_id: null };
		}
	catch(err)
		{
		throw err;
		}
		
	return message_id;
	});

	// THESE METHODS ARE NOT PUBLISHED AND ARE AVAILABLE ONLY FROM THE COMMAND LINE TOOL -- -- -- -- -- -- -- -- -- -- //
self.publishPackage = fibrous( function(package, username, password, github_username, github_password, cwd)
	{
	try {
		removeTemporaryFiles.sync();

		// Get release information
		var settings = database.sync.getSettings();

		// Parse package (name|directory|archive|url|github url) string
		var purl = url.parse(package, true);
		purl.pathname = purl.pathname.replace(/^\/|\/$/g, "");
		var gitoptions = purl.pathname.split("/");

		var cwd_package = cwd + "/" + package;

		// --- 1.1 --- Try local directory <package>
		if(utility.sync.isLocal(package, "directory"))
			package = getLocalPublishDirectory.sync(package);

		// --- 1.2 --- Try local directory <cwd/package>
		else if(utility.sync.isLocal(cwd_package, "directory"))
			package = getLocalPublishDirectory.sync(cwd_package);

		// --- 2.1 --- Try local <package>.zip
		else if(utility.sync.isLocal(package, "file") && package.search(/\.zip$/i) != -1)
			sendMessage.sync(utility.replace(language.TRYING_TO_PUBLISH, {":where": language.LOCAL_ARCHIVE, ":package": package}));

		// --- 2.2 --- Try local <cwd/package>.zip
		else if(utility.sync.isLocal(cwd_package, "file") && package.search(/\.zip$/i) != -1)
			{
			sendMessage.sync(utility.replace(language.TRYING_TO_PUBLISH, {":where": language.LOCAL_ARCHIVE, ":package": package}));
			package = cwd_package;
			}

		// --- 3.1 --- Try GitHub repository <package>
		else if(purl.hostname && purl.hostname.match(/(github\.com)/i) != null && gitoptions.length == 2)
			{
			sendMessage.sync(utility.replace(language.TRYING_TO_PUBLISH, {":where": language.GIT_REPOSITORY, ":package": package}));

			git.sync(gitoptions, github_username, github_password);

			mkdirp.sync(config.WORK_PATH, 0777);
			utility.sync.zipDirectory(config.WORK_PATH, config.WORK_PATH + config.PUBLISH_ZIP);
			package = config.WORK_PATH + config.PUBLISH_ZIP;
			}

		// --- 4.1 --- Try remote <package>.zip (remote url)
		else if(utility.sync.loadRemoteFileToLocalFile(package, config.WORK_PATH, config.PUBLISH_ZIP))
			sendMessage.sync(utility.replace(language.TRYING_TO_PUBLISH, {":where": language.REMOTE_ARCHIVE, ":package": package}));

		// --- FAILURE---
		else
			throw utility.ferror(language.E_FAILED_TO_RESOLVE_PACKAGE.p("ApplicationManager::publishPackage"), {":package": package});

		// Try to publish the package
		var result = utility.sync.postPublish(package, username, password, settings["release_name"]);

		result = utility.parseJSON(result, true);
		if(typeof result != "object")																// Other than 200 OK was received?
			{
			sendMessage.sync(language.PACKAGE_POST_ERROR);
			sendMessage.sync(result + " " + (http_status[result] ? http_status[result].message : http_status["unknown"].message));
			}
		else if(result.err)																			// Errors in the package zip archive and/or manifest?
			{
			sendMessage.sync(language.PACKAGE_POST_ERROR);
			for(e in result.err)
				sendMessage.sync(e + ": " + result.err[e]);
			}
		else
			sendMessage.sync(language.PACKAGE_POST_OK);
		}
	catch(err)
		{
		sendMessage.sync(logger.printErrors(err, false, false, 2));
		}
	finally
		{
		database.close();
		removeTemporaryFiles.sync();
		sendMessage.sync(config.END_OF_MESSAGES);
		}

	return true;
	});

self.register = fibrous( function()
	{
	var erfile, eparts = [];

	try {
		// Load the registration file
		if(utility.sync.isLocal(config.SPACEIFY_REGISTRATION_FILE, "file"))
			{
			erfile = fs.sync.readFile(config.SPACEIFY_REGISTRATION_FILE, {encoding: "utf8"});
			eparts = erfile.split(",");
			}

		if(eparts.length != 2)
			{
			// Create new edge id and password
			var data1 = utility.bytesToHexString(crypto.randomBytes(4));
			var data2 = utility.bytesToHexString(crypto.randomBytes(2));
			var data3 = utility.bytesToHexString(crypto.randomBytes(2));
			var data4i = utility.bytesToHexString(crypto.randomBytes(2));
			var data4r = utility.bytesToHexString(crypto.randomBytes(6));
			var edge_uuid = data1 + "-" + data2 + "-" + data3 + "-" + data4i + "-" + data4r;

			var edge_password = utility.bytesToHexString(crypto.randomBytes(16));

			// Try to register this edge computer
			sendMessage.sync(utility.replace(language.POSTING_REGISTER, {":where": language.REMOTE_ARCHIVE, ":edge_uiid": edge_uuid}));

			var result = utility.sync.postRegister(edge_uuid, edge_password);

			if(typeof result == "number")																// Other than 200 OK was received?
				sendMessage.sync(language.REGISTER_POST_ERROR + result + " " + (http_status[result] ? http_status[result].message : http_status["unknown"].message) + ".");
			else if(result != "")
				sendMessage.sync(language.REGISTER_POST_ERROR + result);
			else
				{
				sendMessage.sync(language.REGISTER_POST_OK);
				fs.sync.writeFile(config.SPACEIFY_REGISTRATION_FILE, {"encoding": "utf8"});
				}
			}
		else
			sendMessage.sync(utility.replace(language.ALREADY_REGISTERED, {":where": language.REMOTE_ARCHIVE, ":edge_uiid": eparts[0]}));
		}
	catch(err)
		{
		printErrors.sync(err);
		}
	finally
		{
		sendMessage.sync(config.END_OF_MESSAGES);	
		}
	});

	// PRIVATE -- -- -- -- -- -- -- -- -- -- //
var getPackage = fibrous( function(package, is_suggested, try_local, username, password, registry_url, cwd)
	{ // Get package by (unique name|directory|archive|url|git url), if is suggested than try only registry, if local try local directories
	var is_package = false;

	var purl = url.parse(package, true);
	purl.pathname = purl.pathname.replace(/^\/|\/$/g, "");
	var gitoptions = purl.pathname.split("/");

	var cwd_package = cwd + "/" + package;

	// --- 1.1 --- Try local directory <package>
	if(!is_suggested && try_local && utility.sync.isLocal(package, "directory"))	
		is_package = getLocalInstallDirectory.sync(package);

	// --- 1.2 --- Try local directory <cwd/package>
	else if(!is_suggested && try_local && utility.sync.isLocal(cwd_package, "directory"))
		is_package = getLocalInstallDirectory.sync(cwd_package);

	// --- 2.1 --- Try local <package>.zip
	else if(!is_suggested && try_local && utility.sync.isLocal(package, "file") && package.search(/\.zip$/i) != -1)
		is_package = getLocalInstallZip.sync(package);

	// --- 2.2 --- Try local <cwd/package>.zip
	else if(!is_suggested && try_local && utility.sync.isLocal(cwd_package, "file") && package.search(/\.zip$/i) != -1)
		is_package = getLocalInstallZip.sync(cwd_package);

	// --- 3.1 --- Try GitHub repository <package>
	else if(!is_suggested && purl.hostname && purl.hostname.match(/(github\.com)/i) != null && gitoptions.length == 2)
		{
		sendMessage.sync(utility.replace(language.TRYING_TO_GET, {":where": language.GIT_REPOSITORY, ":package": package}));

		is_package = git.sync(gitoptions, username, password);
		}

	// --- 4.1 --- Try remote <package>.zip (remote url)
	else if(!is_suggested && utility.sync.loadRemoteFileToLocalFile(package, config.WORK_PATH, config.PACKAGE_ZIP))
		{
		sendMessage.sync(utility.replace(language.TRYING_TO_GET, {":where": language.REMOTE_ARCHIVE, ":package": package}));

		is_package = utility.unZip(config.WORK_PATH + config.PACKAGE_ZIP, config.WORK_PATH, true);
		}

	// --- 5.1 --- Try <unique_name>[@<version>] from the registry - suggested applications can be tried from the registry!!!
	else if(utility.sync.loadRemoteFileToLocalFile(registry_url, config.WORK_PATH, config.PACKAGE_ZIP))
		{
		sendMessage.sync(utility.replace(language.TRYING_TO_GET, {":where": language.SPACEIFY_REGISTRY, ":package": package}));

		// CHECK FOR ERRORS BEFORE TRYING TO FIND THE MANIFEST FROM THE PACKAGE
		is_package = utility.unZip(config.WORK_PATH + config.PACKAGE_ZIP, config.WORK_PATH, true);

		if(utility.sync.isLocal(config.WORK_PATH + config.SPM_ERRORS_JSON, "file"))
			{
			sendMessage.sync(language.PACKAGE_INSTALL_ERROR);

			var errfile = fs.sync.readFile(config.WORK_PATH + config.SPM_ERRORS_JSON, {encoding: "utf8"});
			var result = utility.parseJSON(errfile, true);

			var errors = [];
			for(e in result.err)
				{
				var str = result.err[e].replace("Manifest: ", "");
				errors.push(utility.makeError(e, str, ""));
				}

			throw errors;
			}
		}

	// --- FAILURE ---
	else
		throw utility.ferror(language.E_FAILED_TO_RESOLVE_PACKAGE.p("ApplicationManager::getPackage"), {":package": package});

	return is_package;
	});

var getLocalInstallDirectory = fibrous( function(package)
	{
	sendMessage.sync(utility.replace(language.TRYING_TO_GET, {":where": language.LOCAL_DIRECTORY, ":package": package}));

	package += (package.search(/\/$/) == -1 ? "/" : "");

	if(package + config.PACKAGE_PATH == config.WORK_PATH)				// Prevent infinite recursion
		return false;

	utility.sync.copyDirectory(package, config.WORK_PATH, true);

	return true;
	});

var getLocalInstallZip = fibrous( function(package)
	{
	sendMessage.sync(utility.replace(language.TRYING_TO_GET, {":where": language.LOCAL_ARCHIVE, ":package": package}));

	return utility.unZip(package, config.WORK_PATH, false);
	});

var getLocalPublishDirectory = fibrous( function(package)
	{
	sendMessage.sync(utility.replace(language.TRYING_TO_PUBLISH, {":from": language.LOCAL_DIRECTORY, ":package": package}));

	mkdirp.sync(config.WORK_PATH, 0777);
	utility.sync.zipDirectory(package, config.WORK_PATH + config.PUBLISH_ZIP);
	return config.WORK_PATH + config.PUBLISH_ZIP;
	});

var install = fibrous( function(manifest)
	{
	var app, app_path, app_data;
	var dockerImage = new DockerImage();
	var custom_docker_image = (typeof manifest.docker_image != "undefined" && manifest.docker_image == true ? true : false);
	var docker_image_name = (custom_docker_image ? config.CUSTOM_DOCKER_IMAGE + manifest.unique_name : config.SPACEIFY_DOCKER_IMAGE);

	try {
		app = new Application.obj(manifest);
		if(manifest.type == config.SPACELET)
			app_path = config.SPACELETS_PATH;
		else if(manifest.type == config.SANDBOXED)
			app_path = config.SANDBOXED_PATH;
		/*else if(manifest.type == config.NATIVE)
			app_path = config.NATIVE_PATH;*/

		app_data = database.sync.getApplication([manifest.unique_name]);

		database.sync.begin();																				// global transaction

		// REMOVE EXISTING DOCKER IMAGE(S) AND APPLICATION FILES
		if(app_data)
			remove.sync(app_data, false);

		// INSTALL APPLICATION AND API FILES TO VOLUME DIRECTORY
		sendMessage.sync(language.INSTALL_APPLICATION_FILES);
		var volume_path = app_path + manifest.unique_directory + config.VOLUME_DIRECTORY;
		utility.sync.copyDirectory(config.WORK_PATH, volume_path);											// Copy applications files to volume

		// GENERATE A SPACEIFY CA SIGNED CERTIFICATE FOR THIS APPLICATION
		sendMessage.sync(language.INSTALL_GENERATE_CERTIFICATE);
		createClientCertificate.sync(app_path, manifest);

		// CREATE A NEW DOCKER IMAGE FOR THE APPLICATION FROM THE DEFAULT IMAGE OR CUSTOM IMAGE
		if(custom_docker_image)
			{ // test: docker run -i -t image_name /bin/bash
			sendMessage.sync(utility.replace(language.INSTALL_CREATE_DOCKER_IMAGE, {":image": docker_image_name}));
			utility.execute.sync("docker", ["build", "--no-cache", "--rm", "-t", docker_image_name, "."], {cwd: app_path + manifest.unique_name + config.APPLICATION_PATH}, null);
			}
		else
			sendMessage.sync(utility.replace(language.INSTALL_CREATE_DOCKER, {":image": config.SPACEIFY_DOCKER_IMAGE}));

		var dockerContainer = new DockerContainer();
		dockerContainer.sync.startContainer(app.getProvidesServicesCount(), docker_image_name);
		var image = dockerContainer.sync.installApplication(app);
		manifest.docker_image_id = image.Id;
		dockerImage.sync.removeContainers("", docker_image_name, dockerContainer.getStreams());

		// INSERT/UPDATE APPLICATION DATA TO DATABASE - FINALIZE INSTALLATION
		sendMessage.sync(language.INSTALL_UPDATE_DATABASE);

		database.sync.insertApplication(manifest);

		database.sync.commit();

		// COPY PACKAGE TO INSTALLED PACKAGES DIRECTORY
		utility.sync.zipDirectory(config.WORK_PATH, config.INSTALLED_PATH + manifest.docker_image_id + config.EXT_COMPRESSED);

		// APPLICATION IS NOW INSTALLED SUCCESSFULLY
		var tstr = (manifest.type == config.SPACELET ? "" : language.APPLICATIONLC);
		sendMessage.sync(utility.replace(language.INSTALL_APPLICATION_OK, {":type": utility.ucfirst(manifest.type) + " " + tstr, ":app": manifest.unique_name, ":version": manifest.version}));
		}
	catch(err)
		{
		database.sync.rollback();

		dockerImage.sync.removeImage((manifest.docker_image_id ? manifest.docker_image_id : ""), manifest.unique_name);

		removeUniqueData.sync(app_path, manifest);

		throw utility.error(language.E_FAILED_TO_INSTALL_APPLICATION.p("ApplicationManager::install"), err);
		}
	});

var remove = fibrous( function(app_data, throws)
	{
	var dockerImage = new DockerImage();

	// Stop all the instances of running applications having applications unique_name
	sendMessage.sync(language.REMOVING_APPLICATION);
	coreClient.sync.callRpc("removeApplication", [app_data.unique_name, throws], self);

	// Remove existing docker images + containers
	sendMessage.sync(language.REMOVING_DOCKER);

	var inspected = dockerImage.sync.inspect(app_data.unique_name);
	if(inspected)																					// try to remove committed image - made either from spaceifyubuntu or custom image
		dockerImage.sync.removeImage(app_data.docker_image_id, app_data.unique_name);

	inspected = dockerImage.sync.inspect(config.CUSTOM_DOCKER_IMAGE + app_data.unique_name);		// try to remove custom image
	if(inspected)
		dockerImage.sync.removeImage(inspected.id, config.CUSTOM_DOCKER_IMAGE + app_data.unique_name);

	// Remove application files directory
	sendMessage.sync(language.DELETE_FILES);

	if(app_data.type == config.SPACELET)
		removeUniqueData.sync(config.SPACELETS_PATH, app_data);
	else if(app_data.type == config.SANDBOXED)
		removeUniqueData.sync(config.SANDBOXED_PATH, app_data);
	/*else if(app_data.type == config.NATIVE)
		removeUniqueData.sync(config.NATIVE_PATH, app_data);*/

	// Remove database entries
	sendMessage.sync(language.REMOVE_FROM_DATABASE);

	database.sync.removeApplication(app_data.unique_name);
	});

var removeTemporaryFiles = fibrous( function()
	{
	//utility.sync.deleteFile(config.WORK_PATH + config.PUBLISH_ZIP, false);
	//utility.sync.deleteFile(config.WORK_PATH + config.PACKAGE_ZIP, false);
	utility.sync.deleteDirectory(config.WORK_PATH, false);
	});

var removeUniqueData = fibrous( function(path, obj)
	{ // Removes existing application data and leaves users data untouched
	utility.sync.deleteDirectory(path + obj.unique_directory + config.VOLUME_DIRECTORY + config.APPLICATION_DIRECTORY);
	utility.sync.deleteDirectory(path + obj.unique_directory + config.VOLUME_DIRECTORY + config.TLS_DIRECTORY);

	if(utility.sync.isLocal(config.INSTALLED_PATH + obj.docker_image_id + config.EXT_COMPRESSED, "file"))
		fs.sync.unlink(config.INSTALLED_PATH + obj.docker_image_id + config.EXT_COMPRESSED);
	});

var createClientCertificate = fibrous( function(app_path, manifest)
	{
	var tls_path = app_path + manifest.unique_directory + config.VOLUME_DIRECTORY + config.TLS_DIRECTORY;

	try {
		// Create an unique configuration for every certificate by using/modifying the openssl configurations.
		utility.execute.sync("./makeserver.sh", [tls_path, manifest.unique_name], {cwd: config.TLS_SQUID_PATH}, null);
		}
	catch(err)
		{
		throw utility.error(language.E_FAILED_CERTIFICATE_CREATE.p("ApplicationManager::createClientCertificate"), err);
		}
	});

var git = fibrous( function(gitoptions, username, password)
	{
	gitoptions[1] = gitoptions[1].replace(/(.git)$/i, "");

	try {
		var github = new Github({version: "3.0.0"});

		if(username != "" && password != "")																					// Use authentication when its provided
			github.authenticate({type: "basic", username: username, password: password});

		var content = github.repos.sync.getContent({user: gitoptions[0], repo: gitoptions[1], path: ""});

		var ref = github.gitdata.sync.getReference({user: gitoptions[gitoptions.length - 2], repo: gitoptions[1], ref: "heads/master"});

		var tree = github.gitdata.sync.getTree({user: gitoptions[0], repo: gitoptions[1], sha: ref.object.sha, recursive: 1});	// get the whole repository content
		tree = tree.tree;

		var blobs = 0, blobPos = 1;
		for(i=0; i<tree.length; i++)																						// get the blob count
			{
			if(tree[i].type == "blob")
				blobs++;
			}

		var tmp_path = config.WORK_PATH;
		mkdirp.sync(tmp_path, 0755);
		for(var i=0; i<tree.length; i++)																					// create required directories and get blobs of data
			{
			if(tree[i].type == "tree")
				mkdirp.sync(tmp_path + tree[i].path, 0755);
			else if(tree[i].type == "blob")
				{
				sendMessage.sync(utility.replace(language.DOWNLOADING_GITUHB, {":pos": blobPos++, ":count": blobs, ":what": tree[i].path, ":bytes": tree[i].size/*, ":where": tree[i].url*/}));

				var blob = github.gitdata.sync.getBlob({user: gitoptions[0], repo: gitoptions[1], sha: tree[i].sha});
				fs.sync.writeFile(tmp_path + tree[i].path, blob.content, {"encoding": blob.encoding.replace("-", "")});		// base64 or utf-8 (utf8 in nodejs)
				}
			}
		}
	catch(err)
		{
		throw utility.error(language.E_FAILED_GITHUB_DATA.p("ApplicationManager::git"), err);
		}

	return true;
	});

var checkAuthentication = fibrous( function(ip, session_id, is_spm)
	{
	var authenticated = false;

	var is_local = securityModel.isLocalIP(ip);
	if(is_local && is_spm && !session_id)															// The call comes from spm
		authenticated = true;
	else if(is_local && !is_spm && coreClient.sync.callRpc("isAdminLoggedIn", [session_id], self))	// The call comes from the action Kiwi view
		authenticated = true;
	else
		throw utility.error(language.E_ADMIN_NOT_LOGGED_IN.p("ApplicationManager::checkAuthentication"));

	return authenticated;
	});

var sendMessage = fibrous( function()
	{
	for(id in messageids)																	// Send messages to verified connections
		{
		if(messageids[id].connection_id)
			{
			for(var i=0; i<arguments.length; i++)
				messageServer.sendMessage(JSON.stringify({message: arguments[i]}), messageids[id].connection_id);
			}
		}

	for(var i=0; i<arguments.length; i++)													// Output to console
		{
		if(arguments[i] != config.END_OF_MESSAGES)
			logger.force(arguments[i], false);
		}
	});

var printErrors = fibrous( function(err)
	{
	if(err instanceof Array)																// These errors may originate from getPackage or validate
		{
		for(var i=0; i<err.length; i++)
			sendMessage.sync("(" + err[i].getCode() + "): " + err[i].getMessage());
		}
	else if(err)																			// "Normal" errors
		{
		sendMessage.sync(err.getMessage ? err.getMessage() : err.toString());
		throw utility.error(err);
		}
	});

var carbageCollection = function()
	{
	// Allow one minute to confirm a connection (see messageServerMessageListener)
	for(id in messageids)
		{
		if((Date.now() - messageids[id].timestamp) >= carbage_interval && !messageids[id].connection_id)
			delete messageids[id];
		}

	// Allow unconfirmed connections to be open for one minute before disconnecting (see messageServerMessageListener)
	for(id in connectionids)
		{
		if(Date.now() - connectionids[id].timestamp >= carbage_interval)
			{
			messageServer.closeConnection(connectionids[id]);
			delete connectionids[id];
			}
		}
	}

}

module.exports = ApplicationManager;
