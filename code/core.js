#!/usr/bin/env node
/**
 * Spaceify core, 2.9.2013 Spaceify Inc.
 * 
 * @class Core
 */

var fs = require("fs");
var mkdirp = require("mkdirp");
var crypto = require("crypto");
var fibrous = require("fibrous");
var logger = require("./www/libs/logger");
var config = require("./config")();
var utility = require("./utility");
var DHCPDLog = require("./dhcpdlog");
var Iptables = require("./iptables");
var language = require("./language");
var Database = require("./database");
var connectionHub = require("./connectionhub");
var SecurityModel = require("./securitymodel");
var SpaceletManager = require("./spaceletmanager");
var SandboxedManager = require("./sandboxedmanager");
var WebSocketRPCServer = require("./websocketrpcserver");

function Core()
{
var self = this;

var owner = "Core";
var accept_ip = "";
var settings = null;
var servers_count = 0;
var servers_up_counter = 0;
var isLoggedInToSpaceifyNet = false;

var dhcpdlog = new DHCPDLog();
var database = new Database();
var iptables = new Iptables();
var securityModel = new SecurityModel();
var ConnectionHub = new connectionHub();
var coreRPCS = new WebSocketRPCServer();
var coreRPCSS = new WebSocketRPCServer();
//var nativeManager = new NativeManager();
var spaceletManager = new SpaceletManager();
var sandboxedManager = new SandboxedManager();

var key = config.SPACEIFY_TLS_PATH + config.SERVER_KEY;
var crt = config.SPACEIFY_TLS_PATH + config.SERVER_CRT;
var ca_crt = config.SPACEIFY_WWW_PATH + config.SPACEIFY_CRT;

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// CONNECTION  // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.connect = fibrous( function(opts)
	{
	options = opts;

	servers_count = Object.keys(options.servers).length;

	ConnectionHub.setup.sync(options.servers);								// Connnection hub uses the same servers as core

	for(o in options.servers)												// Handle all the supported server types
		{
		var server = options.servers[o].server;

		// Set listeners - keep servers open
		server.setServerUpListener(serverUpListener);
		server.setServerDownListener(serverDownListener);
		server.setAccessListener(accessListener);

		// Expose RPC nethods
		server.exposeRpcMethod("startSpacelet", self, startSpacelet);
		server.exposeRpcMethod("getService", self, getService);
		server.exposeRpcMethod("getServices", self, getServices);
		server.exposeRpcMethod("registerService", self, registerService);
		server.exposeRpcMethod("unregisterService", self, unregisterService);
		server.exposeRpcMethod("setSplashAccepted", self, setSplashAccepted);
		server.exposeRpcMethod("startApplication", self, startApplication);
		server.exposeRpcMethod("stopApplication", self, stopApplication);
		server.exposeRpcMethod("removeApplication", self, removeApplication);
		server.exposeRpcMethod("isApplicationRunning", self, isApplicationRunning);
		server.exposeRpcMethod("getApplicationData", self, getApplicationData);
		server.exposeRpcMethod("getApplicationURL", self, getApplicationURL);
		server.exposeRpcMethod("getManifest", self, getManifest);
		server.exposeRpcMethod("connectTo", self, connectTo);
		server.exposeRpcMethod("updateSettings", self, updateSettings);

		// THESE ARE EXPOSED ONLY OVER SECURE CONNECTION!!!
		if(options.servers[o].is_secure)
			{
			server.exposeRpcMethod("adminLogIn", self, adminLogIn);
			server.exposeRpcMethod("adminLogOut", self, adminLogOut);
			server.exposeRpcMethod("isAdminLoggedIn", self, isAdminLoggedIn);
			server.exposeRpcMethod("saveOptions", self, saveOptions);
			server.exposeRpcMethod("loadOptions", self, loadOptions);
			}

		// Connect
		connectServer.sync(o);
		}

	// Get settings from the database
	settings = database.sync.getSettings();
	securityModel.setSettings(settings);
	});

var connectServer = fibrous( function(server_type)
	{
	var sobj = options.servers[server_type];
	sobj.server.sync.connect({hostname: null, port: sobj.port, is_secure: sobj.is_secure, key: key, crt: crt, ca_crt: ca_crt, owner: owner});
	});

self.close = fibrous( function()
	{
	spaceletManager.sync.removeAll(true);
	sandboxedManager.sync.removeAll(true);
	//nativeManager.sync.removeAll(true);

	for(o in options.servers)												// Handle all the supported server types
		options.servers[o].server.close();
	});

var serverUpListener = function(server)
	{
	if(++servers_up_counter == servers_count)								// Initialization phase: set applications running when all servers are listening
		{
		fibrous.run( function()
			{
			try {
				sandboxedManager.sync.start(null, false);
				spaceletManager.sync.start(null, false, false);
				//nativeManager.sync.start(null, false);
				}
			catch(err)
				{
				logger.printErrors(err, true, true, 0);
				}
			}, function(err, data) { } );
		}
	}

var serverDownListener = function(server)
	{
	setTimeout(function(server_type)
		{
		fibrous.run( function() { connectServer(server_type); }, function(err, data) { } );
		}, config.RECONNECT_WAIT, server.server_type);
	}

var accessListener = function(remoteAddress, remotePort, origin, server_type, is_secure, requestedProtocols)
	{
	if(!securityModel.hasRequestedProtocol(requestedProtocols))
		return {message: language.PROTOCOLS_DENIED, granted: false};

	/*if(!securityModel.isLocalIP(remoteAddress))
		return {message: language.REMOTE_DENIED, granted: false};*/

	return {message: "", granted: true};	
	}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// EXPOSED RPC METHODS  // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
var startSpacelet = fibrous( function(unique_name)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument
	var connection_ip = connobj.remoteAddress;
	var spacelet = null;

	if(securityModel.isApplicationIP(connection_ip))
		throw utility.error(language.E_APPLICATION_CAN_NOT_START_SPACELET.p("Core::startSpacelet"));

	try {
		spacelet = spaceletManager.sync.start(unique_name, true, true);
		}
	catch(err)
		{
		throw utility.error(language.E_FAILED_TO_START_SPACELET.p("Core::startSpacelet"), err);
		}

	return (spacelet ? spacelet.getProvidesServices() : []);
	});

var registerService = fibrous( function(service_name)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument
	var connection_ip = connobj.remoteAddress;

	// ALLOW REGISTRATION FROM APPLICATIONS ONLY - STARTED CONTAINERS (APPLICATIONS) HAVE AN IP THAT IDENTIFIES THEM
	var _find = self.find("container_ip", connection_ip);

	if(!_find.obj)
		throw utility.ferror(language.E_REGISTER_SERVICE_UNKNOWN_ADDRESS.p("Core::registerService"), {":address": connection_ip});

	// ToDo: Other security considerations before accepting the registration?

	// APPLICATION CAN REGISTER ONLY ITS OWN SERVICES = SERVICE NAME FOUND IN ITS SERVICES
	var service = _find.obj.registerService(service_name, true);
	if(!service)
		throw utility.ferror(language.E_REGISTER_SERVICE_UNKNOWN_SERVICE_NAME.p("Core::registerService"), {":name": service_name});

	return service;
	});

var unregisterService = fibrous( function(service_name)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument
	var connection_ip = connobj.remoteAddress;

	// ALLOW UNREGISTRATION FROM APPLICATIONS ONLY - STARTED CONTAINERS (APPLICATIONS) HAVE AN IP THAT IDENTIFIES THEM
	var _find = self.find("container_ip", connection_ip);

	if(!_find.obj)
		throw utility.error(language.E_UNREGISTER_SERVICE_UNKNOWN_ADDRESS.p("Core::unregisterService"), {address: connection_ip});

	// ToDo: Other security considerations before accepting the unregistration?

	// APPLICATION CAN UNREGISTER ONLY ITS OWN SERVICES = SERVICE NAME FOUND IN THE SERVICES
	var service = _find.obj.registerService(service_name, false);
	if(!service)
		throw utility.error(language.E_UNREGISTER_SERVICE_UNKNOWN_SERVICE_NAME.p("Core::unregisterService"), {name: service_name});

	return service;
	});

var getService = fibrous( function(service_name, unique_name)
	{ // Get either by service name or service name and unique_name.
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument
	var connection_ip = connobj.remoteAddress;

	// TRY TO FIND THE SERVICE
	var _service = self.find("service", {service_name: service_name, unique_name: unique_name});

	if(!_service.obj)
		throw utility.ferror(language.E_GET_SERVICE_UNKNOWN.p("Core::getService"), {":name": service_name});

	if(!_service.obj.registered)
		throw utility.ferror(language.E_GET_SERVICE_UNREGISTERED.p("Core::getService"), {":name": service_name});

	//_application = self.find("container_ip", connection_ip);
	//securityModel.isLocalIP(_service.obj, connection_ip);
	// ToDo:
	// SPACELET, SANDBOXED APPLICATIONS OR NATIVE APPLICATION CAN ASK SERVICES THAT ARE LISTED IN THEIR MANIFESTS REQUIRED SERVICES.
	// or anybody can ask any service?
	// http and https services are "open" to everyone
	/*if(_find.obj.service_type == config.OPEN) // UNLESS SERVICE TYPE IS OPEN
		{
		if((client = self.find("container_ip", connobj.remoteAddress)) == null)
		throw utility.error(language.E_GET_SERVICE_UNKNOWN_ADDRESS.p("Core::getService"));
		// ip not from local source
		}
	else if(_find.obj.service_type == config.OPEN_LOCAL)
		{
		}
	else if(_find.obj.service_type == config.STANDARD)
		{
		}*/

	// ToDo: create iptable rule to allow traffic.
		
	return _service.obj;
	});

var getServices = fibrous( function(unique_names)
	{ // Get all the services for all the unique applications on the list
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument
	var connection_ip = connobj.remoteAddress;

	// TRY TO FIND THE SERVICE
	var services = [];
	for(var i=0; i<unique_names.length; i++)
		{
		var _service = self.find("services", unique_names[i]);

		services = services.concat(_service.obj ? _service.obj : []);
		}

	return services;
	});
	
var adminLogIn = fibrous( function(password)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument
	var connection_ip = connobj.remoteAddress;

	var session_id = null;

	try {
		if(!securityModel.isLocalIP(connection_ip))											// Only the local callers can call this method
			throw utility.error(language.E_ADMIN_LOGIN_DENIED.p("Core::adminLogIn"));

		if(securityModel.isApplicationIP(connection_ip))									// Applications can't call this method
			throw utility.error(language.E_ADMIN_LOGIN_DENIED.p("Core::adminLogIn"));

		// GET CLIENTS MAC
		/*var lease = dhcpdlog.getDHCPLeaseByIP(connection_ip);
		if(!lease)
			throw utility.error(language.E_UNKNOWN_MAC.p("Core::adminLogIn"));*/

		// CHECK THE PASSWORD - UPDATE DATABASE
		user = database.sync.getUserData();

		if(typeof user == "undefined")
			throw utility.error(language.E_ADMIN_LOGIN_USER.p("Core::adminLogIn"));

		var shasum = crypto.createHash("sha512");
		shasum.update(password + user.admin_salt);
		var password_hash = shasum.digest("hex").toString();

		if(password_hash != user.admin_password_hash)
			throw utility.error(language.E_ADMIN_LOGIN_PASSWORD.p("Core::adminLogIn"));

		var last_login = Date.now();
		database.sync.adminLoggedIn([last_login]);

		// START A NEW SESSION
		shasum = crypto.createHash("sha512");
		var result = utility.bytesToHexString(crypto.randomBytes(32));
		shasum.update(result);
		session_id = shasum.digest("hex").toString();

		//securityModel.adminLogIn(lease["mac_or_duid"], session_id, last_login, connection_ip);
		securityModel.adminLogIn(session_id, last_login, connection_ip);
		}
	catch(err)
		{
		throw utility.error(err);
		}
	finally
		{
		database.close();
		}

	return session_id;
	});

var adminLogOut = fibrous( function(session_id)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument
	var connection_ip = connobj.remoteAddress;

	try {
		if(!securityModel.isLocalIP(connection_ip))											// Only the local callers can call this method
			throw utility.error(language.E_ADMIN_LOGIN_DENIED.p("Core::adminLogOut"));

		if(securityModel.isApplicationIP(connection_ip))									// Applications can't call this method
			throw utility.error(language.E_ADMIN_LOGIN_DENIED.p("Core::adminLogOut"));

		// GET CLIENTS MAC
		/*var lease = dhcpdlog.getDHCPLeaseByIP(connection_ip);
		if(!lease)
			throw utility.error(language.E_UNKNOWN_MAC.p("Core::adminLogOut"));*/

		securityModel.adminLogOut(/*lease["mac_or_duid"], */session_id);
		}
	catch(err)
		{
		throw utility.error(err);
		}

	return true;
	});

var isAdminLoggedIn = fibrous( function(session_id)
	{
	var session = securityModel.findSession(session_id);
	return (session ? true : false);
	});

var setSplashAccepted = fibrous( function()
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument
	var connection_ip = connobj.remoteAddress;

	try {
		var lease = dhcpdlog.getDHCPLeaseByIP(connection_ip);							// Lease must exist for the device
		if(!lease)
			throw utility.error(language.E_UNKNOWN_MAC.p("Core::setSplashAccepted"));

		if(!iptables.sync.splashAddRule(lease.mac_or_duid))								// Add MAC to the iptables rules
			throw utility.error(language.E_SPLASH_ADD_FAILED.p("Core::setSplashAccepted"));

		/*	The following line removes connection tracking for the PC. This clears any previous (incorrect) route info for the redirection
			exec("sudo rmtrack ".$_SERVER['REMOTE_ADDR']);
			Create the file /usr/bin/rmtrack and make it executable with the following contents:
				/usr/sbin/conntrack -L \
				|grep $1 \
				|grep ESTAB \
				|grep 'dport=80' \
				|awk \
				"{ system(\"conntrack -D --orig-src $1 --orig-dst \" \
				substr(\$6,5) \" -p tcp --orig-port-src \" substr(\$7,7) \" \
				--orig-port-dst 80\"); }"	*/
		}
	catch(err)
		{
		throw utility.error(err);
		}

	return true;
	});

var startApplication = fibrous( function(unique_name, run, throws)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument
	var connection_ip = connobj.remoteAddress;

	try {
		if(!securityModel.isLocalIP(connection_ip))
			throw utility.error(language.E_NON_EDGE_CALLER.p("Core::startApplication"));

		var app = database.sync.getApplication(unique_name);
		if(!app && throws)
			throw utility.ferror(language.E_PACKAGE_NOT_INSTALLED.p("Core::startApplication"), {":name": unique_name});

		if(isApplicationRunning.sync(unique_name, connobj))
			throw utility.ferror(language.PACKAGE_ALREADY_RUNNING.p("Core::startApplication"), {":type": config.HR_TYPES[app.type], ":name": unique_name});

		if(app && app.type == config.SPACELET)
			spaceletManager.sync.start(unique_name, run, true);
		else if(app && app.type == config.SANDBOXED)
			sandboxedManager.sync.start(unique_name, true);
		/*else if(app && app.type == config.NATIVE)
			nativeManager.sync.start(unique_name, true);*/
		}
	catch(err)
		{
		throw err;
		}
	finally
		{
		database.close();
		}

	return true;
	});

var stopApplication = fibrous( function(unique_name, throws)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument
	var connection_ip = connobj.remoteAddress;

	if(!securityModel.isLocalIP(connection_ip))											// Only local caller (applicationmanager/spm) can call this method
		throw utility.error(language.E_NON_EDGE_CALLER.p("Core::stopApplication"));

	_find = self.find("application", unique_name);
	if(!_find.manager && throws)
		throw utility.ferror(language.E_PACKAGE_NOT_INSTALLED.p("Core::stopApplication"), {":name": unique_name});

	if(_find.manager)
		_find.manager.sync.stop(unique_name);

	return true;
	});

var removeApplication = fibrous( function(unique_name, throws)
	{ // Stops application and removes it from the running applications list - files are not removed.
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument
	var connection_ip = connobj.remoteAddress;

	if(!securityModel.isLocalIP(connection_ip))
		throw utility.error(language.E_NON_EDGE_CALLER.p("Core::removeApplication"));

	_find = self.find("application", unique_name);
	if(!_find.manager && throws)
		throw utility.ferror(language.E_PACKAGE_NOT_INSTALLED.p("Core::removeApplication"), {":name": unique_name});

	if(_find.manager)
		_find.manager.sync.remove(unique_name);

	return true;
	});

var isApplicationRunning = fibrous( function(unique_name)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument

	_find = self.find("is_running", unique_name);

	return _find.obj;
	});

var getApplicationData = fibrous( function(unique_name)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument

	var app_dir = "";
	var app_data = null;
	var manifest = null;
	var services = null;

	try {
		var app_data = { spacelets: [], sandboxed: [], native: [] };

		var spacelets = database.sync.getApplications([config.SPACELET]) || [];
		for(var i=0; i<spacelets.length; i++)
			{
			app_dir = config.SPACELETS_PATH + spacelets[i].unique_directory + config.VOLUME_DIRECTORY + config.APPLICATION_DIRECTORY;

			manifest = getManifest.sync(spacelets[i].unique_name);
			manifest.has_tile = utility.sync.isLocal(app_dir + config.WWW_DIRECTORY + config.TILEFILE, "file");
			manifest.is_running = spaceletManager.isRunning(manifest.unique_name);
			app_data.spacelets.push(manifest);
			}

		var sandboxed = database.sync.getApplications([config.SANDBOXED]) || [];
		for(var i=0; i<sandboxed.length; i++)
			{
			app_dir = config.SANDBOXED_PATH + sandboxed[i].unique_directory + config.VOLUME_DIRECTORY + config.APPLICATION_DIRECTORY;

			manifest = getManifest.sync(sandboxed[i].unique_name);
			manifest.has_tile = utility.sync.isLocal(app_dir + config.WWW_DIRECTORY + config.TILEFILE, "file");
			manifest.is_running = sandboxedManager.isRunning(manifest.unique_name);

			app_data.sandboxed.push(manifest);
			}

		/*var native = database.sync.getApplications([config.NATIVE]) || [];
		for(var i=0; i<native.length; i++)
			{
			app_dir = config.NATIVE_PATH + native[i].unique_directory + config.VOLUME_DIRECTORY + config.APPLICATION_DIRECTORY;

			manifest = getManifest.sync(native[i].unique_name);
			manifest.has_tile = utility.sync.isLocal(app_dir + config.WWW_DIRECTORY + config.TILEFILE, "file");
			manifest.is_running = nativeManager.isRunning();
			app_data.native.push(utility.parseJSON(manifest), true);
			}*/
		}
	catch(err)
		{
		throw utility.error(language.E_GET_APP_DATA_FAILED.p("Core::getApplicationData"), err);
		}
	finally
		{
		database.close();
		}

	return app_data;
	});

var getApplicationURL = fibrous( function(unique_name)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument

	var app_dir = "";

	try {
		var type = self.find("type", unique_name);
		var is_running = self.find("is_running", unique_name);
		var implements_web_server = self.find("implements_web_server", unique_name);
		var http = self.find("service", {service_name: "http", unique_name: unique_name});
		var https = self.find("service", {service_name: "https", unique_name: unique_name});

		if(implements_web_server.obj && is_running.obj && http.obj && https.obj)			// Use applications internal server
			{
			http_port = http.obj.port;
			https_port = https.obj.port;
			http_url = config.EDGE_IP + ":" + http_port;
			https_url = config.EDGE_IP + ":" + https_port;
			}
		else																				// Use cores web server
			{
			http_port = null;
			https_port = null;
			http_url = config.EDGE_IP;
			https_url = config.EDGE_IP;
			}
		}
	catch(err)
		{
		throw utility.error(language.E_GET_APP_URL_FAILED.p("Core::getApplicationURL"), err);
		}

	return {http_url: http_url, https_url: https_url, http_port: http_port, https_port: https_port, unique_name: unique_name, type: type.obj};
	});

var getManifest = fibrous( function(unique_name)
	{
	var service = null;

	// TRY TO GET THE MANIFEST
	var _find = self.find("manifest", unique_name);

	if(!_find.obj)
		throw utility.ferror(language.E_GET_MANIFEST_NOT_FOUND.p("Core::getManifest"), {":name": unique_name});

	return _find.obj;
	});

var connectTo = fibrous( function(service_name, is_secure)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument

	var _find = spaceletManager.find("service", service_name);
	if(!_find.obj)
		throw utility.ferror(language.E_NOT_A_SPACELET_SERVICE.p("Core::getManifest"), {":name": service_name});

		// tarkista origin 
		
	var port = (is_secure ? service.secure_port : service.port);

	ConnectionHub.connectTo.sync(service_port, is_secure, connobj.server_type, connobj.id);
	});

var updateSettings = fibrous( function(settings, session_id)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument

	try {
		if(!isAdminLoggedIn(session_id))
			throw utility.error(language.E_AUTHENTICATION_FAILED.p("Core::updateSettings"));

		// Update the settings
		// ToDo: Allow: language, splash_ttl, session_ttl
		// ToDo: Enable database.sync.updateSettings(settings)
		}
	catch(err)
		{
		throw utility.error(language.E_FAILED_TO_UPDATE_SETTINGS.p("Core::updateSettings"), err);
		}
	finally
		{
		database.close();
		unlock();
		}
	});

// USER APPLICATION SPECIFIC
var saveOptions = fibrous( function(session_id, unique_name, directory, file, data)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument
	var connection_ip = connobj.remoteAddress;

	var optionsOk = false;
	var session = securityModel.findSession(session_id);
	
	try {
		if(!session || session.ip != connection_ip)										// Accept only from the same ip (= logged in device)
			throw utility.error(language.E_INVALID_SESSION.p("Core::saveOptions"));

		var app = database.sync.getApplication(unique_name) || null;					// Get application, path to volume, create directory and save
		if(!app)
			throw utility.ferror(language.E_PACKAGE_NOT_INSTALLED.p("Core::saveOptions"), {":name": unique_name});

		var volume = "";
		if(app.type == config.SPACELET)
			volume = config.SPACELETS_PATH + app.unique_directory + config.VOLUME_DIRECTORY;
		else if(app.type == config.SANDBOXED)
			volume = config.SANDBOXED_PATH + app.unique_directory + config.VOLUME_DIRECTORY;
		/*else if(app.type == config.NATIVE)
			volume = config.NATIVEAPPS_PATH + app.unique_directory + config.VOLUME_DIRECTORY;*/

		if(directory != "")
			{
			directory += (directory.search(/\/$/) != -1 ? "" : "/");
			mkdirp.sync(volume + directory, parseInt("0755", 8));
			}

		fs.sync.writeFile(volume + directory + file, data);

		optionsOk = true;
		}
	catch(err)
		{
		throw utility.error(err);
		}
	finally
		{
		database.close();
		}

	return optionsOk;
	});

var loadOptions = fibrous( function(session_id, unique_name, directory, file)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument
	var connection_ip = connobj.remoteAddress;

	var data = null;
	var session = securityModel.findSession(session_id);
	
	try {
		if(!session || session.ip != connection_ip)										// Accept only from the same ip (= logged in device)
			throw utility.error(language.E_INVALID_SESSION.p("Core::loadOptions"));

		var app = database.sync.getApplication(unique_name) || null;					// Get application, path to volume and load
		if(!app)
			throw utility.ferror(language.E_PACKAGE_NOT_INSTALLED.p("Core::loadOptions"), {":name": unique_name});

		var volume = "";
		if(app.type == config.SPACELET)
			volume = config.SPACELETS_PATH + app.unique_directory + config.VOLUME_DIRECTORY;
		else if(app.type == config.SANDBOXED)
			volume = config.SANDBOXED_PATH + app.unique_directory + config.VOLUME_DIRECTORY;
		/*else if(app.type == config.NATIVE)
			volume = config.NATIVE_PATH + app.unique_directory + config.VOLUME_DIRECTORY;*/

		if(directory != "")
			directory += (directory.search(/\/$/) != -1 ? "" : "/");

		var data = fs.sync.readFile(volume + directory + file, {encoding: "utf8"});
		}
	catch(err)
		{
		throw utility.error(err);
		}
	finally
		{
		database.close();
		}

	return data;
	});

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// PUBLIC NON-EXPOSED   // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.loginToSpaceifyNet = fibrous( function(mode)
	{
	try {
		var user = database.sync.getUserData();

		var result = utility.sync.postForm(config.EDGE_LOGIN, {form: {un: user.edge_id, pw: user.edge_password, md: mode}});

		if(mode == "login")
			{
			isLoggedInToSpaceifyNet = true;

			if(result.body == "")
				logger.info(utility.replace(language.LOGGED_IN_SPACEIFY_NET, {":edge_id": user.edge_id}));
			else
				logger.warn(utility.replace(language.LOGGING_IN_SPACEIFY_NET_FAILED, {":result": result.body}));
			}
		else
			{
			isLoggedInToSpaceifyNet = false;

			logger.info(language.LOGGED_OUT_SPACEIFY_NET);
			}
		}
	catch(err)
		{
		isLoggedInToSpaceifyNet = false;

		throw utility.error(language.E_EDGE_LOGIN.p("Core::loginToSpaceifyNet"), err);
		}
	finally
		{
		database.close();
		}
	});

self.find = function(_param, _find)
	{
	var obj = spaceletManager.find(_param, _find);
	var man = spaceletManager;

	if(obj == null)
		{
		obj = sandboxedManager.find(_param, _find);
		man = sandboxedManager;
		}

	/*if(obj == null)
		{
		obj = nativeManager.find(_param, _find);
		man = nativeManager;
		}*/

	return {obj: obj, manager: (obj == null ? null : man)};
	}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// PRIVATE  // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //

}

module.exports = Core;
