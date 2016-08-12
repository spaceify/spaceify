"use strict";

/**
 * Spaceify core, 2.9.2013 Spaceify Oy
 * 
 * @class Core
 */

var fs = require("fs");
var mkdirp = require("mkdirp");
var fibrous = require("fibrous");
var Logger = require("./logger");
var Manager = require("./manager");
var DHCPDLog = require("./dhcpdlog");
var Iptables = require("./iptables");
var language = require("./language");
var Database = require("./database");
var httpStatus = require("./httpstatus");
var SecurityModel = require("./securitymodel");
var SpaceifyError = require("./spaceifyerror");
var SpaceifyConfig = require("./spaceifyconfig");
var SpaceifyUtility = require("./spaceifyutility");
var WebSocketRpcServer = require("./websocketrpcserver");

function Core()
{
var self = this;

var logger = new Logger();
var dhcpdlog = new DHCPDLog();
var database = new Database();
var iptables = new Iptables();
var errorc = new SpaceifyError();
var config = new SpaceifyConfig();
var utility = new SpaceifyUtility();
var spaceletManager = new Manager(config.SPACELET);
var sandboxedManager = new Manager(config.SANDBOXED);
var nativeManager = new Manager(config.NATIVE);
var securityModel = new SecurityModel();

var coreSettings = null;

var servers = {};
var connections = {};
var key = config.SPACEIFY_TLS_PATH + config.SERVER_KEY;
var crt = config.SPACEIFY_TLS_PATH + config.SERVER_CRT;
var caCrt = config.SPACEIFY_WWW_PATH + config.SPACEIFY_CRT;

	// CONNECTION -- -- -- -- -- -- -- -- -- -- //
self.connect = fibrous( function()
	{
	var native;
	var spacelets
	var sandboxed;
	var webSocketRpcServer;
	var i, types = [{port: config.CORE_PORT, isSecure: false}, {port: config.CORE_PORT_SECURE, isSecure: true}];

	for(i = 0; i < types.length; i++)															// Setup/open the servers
		{
		webSocketRpcServer = new WebSocketRpcServer();

		webSocketRpcServer.setConnectionListener(connectionListener);
		webSocketRpcServer.setDisconnectionListener(disconnectionListener);

		// Expose RPC nethods
		webSocketRpcServer.exposeRpcMethod("startSpacelet", self, startSpacelet);
		webSocketRpcServer.exposeRpcMethod("getService", self, getService);
		webSocketRpcServer.exposeRpcMethod("getOpenServices", self, getOpenServices);
		webSocketRpcServer.exposeRpcMethod("registerService", self, registerService);
		webSocketRpcServer.exposeRpcMethod("unregisterService", self, unregisterService);
		webSocketRpcServer.exposeRpcMethod("isApplicationRunning", self, isApplicationRunning);
		webSocketRpcServer.exposeRpcMethod("getApplicationData", self, getApplicationData);
		webSocketRpcServer.exposeRpcMethod("getApplicationURL", self, getApplicationURL);
		webSocketRpcServer.exposeRpcMethod("getManifest", self, getManifest);
		//webSocketRpcServer.exposeRpcMethod("connectTo", self, connectTo);
		webSocketRpcServer.exposeRpcMethod("setSplashAccepted", self, setSplashAccepted);
		webSocketRpcServer.exposeRpcMethod("setEventListeners", self, setEventListeners);

		// THESE ARE EXPOSED ONLY OVER A SECURE CONNECTION!!!
		if(types[i].isSecure)
			{
			webSocketRpcServer.exposeRpcMethod("adminLogIn", self, adminLogIn);
			webSocketRpcServer.exposeRpcMethod("adminLogOut", self, adminLogOut);
			webSocketRpcServer.exposeRpcMethod("isAdminLoggedIn", self, isAdminLoggedIn);
			webSocketRpcServer.exposeRpcMethod("startApplication", self, startApplication);
			webSocketRpcServer.exposeRpcMethod("stopApplication", self, stopApplication);
			webSocketRpcServer.exposeRpcMethod("installApplication", self, installApplication);
			webSocketRpcServer.exposeRpcMethod("removeApplication", self, removeApplication);
			webSocketRpcServer.exposeRpcMethod("getCoreSettings", self, getCoreSettings);
			webSocketRpcServer.exposeRpcMethod("saveCoreSettings", self, saveCoreSettings);
			webSocketRpcServer.exposeRpcMethod("getEdgeSettings", self, getEdgeSettings);
			webSocketRpcServer.exposeRpcMethod("saveEdgeSettings", self, saveEdgeSettings);
			webSocketRpcServer.exposeRpcMethod("getServiceRuntimeStates", self, getServiceRuntimeStates);
			//webSocketRpcServer.exposeRpcMethod("saveOptions", self, saveOptions);
			//webSocketRpcServer.exposeRpcMethod("loadOptions", self, loadOptions);
			}

		webSocketRpcServer.sync.listen({	hostname: config.ALL_IPV4_LOCAL, port: types[i].port,
											isSecure: types[i].isSecure, key: key, crt: crt, caCrt: caCrt,
											keepUp: true, debug: true });

		servers[webSocketRpcServer.getId()] = webSocketRpcServer;
		}

	// Install (insert) applications to cores lists
	try
		{
		spacelets = database.sync.getApplications([config.SPACELET]);
		sandboxed = database.sync.getApplications([config.SANDBOXED]);
		native = database.sync.getApplications([config.NATIVE]);

		for(i = 0; i < spacelets.length; i++)
			spaceletManager.sync.install(spacelets[i].unique_name, false);

		for(i = 0; i < sandboxed.length; i++)
			{
			sandboxedManager.sync.install(sandboxed[i].unique_name, false);
			sandboxedManager.sync.start(sandboxed[i].unique_name);
			}

		for(i = 0; i < native.length; i++)
			{
			nativeManager.sync.install(native[i].unique_name, false);
			nativeManager.sync.start(native[i].unique_name);
			}
		}
	catch(err)
		{
		}
	finally
		{
		database.close();
		}

	// Get core settings from the database
	coreSettings = database.sync.getCoreSettings();
	securityModel.setCoreSettings(coreSettings);
	});

self.close = fibrous( function()
	{
	spaceletManager.sync.removeAll();
	sandboxedManager.sync.removeAll();
	nativeManager.sync.removeAll();

	for(var i in servers)
		servers[i].close();
	});

var connectionListener = function(connectionId, serverId, isSecure)
	{
	connections[connectionId] = {events: [], serverId: serverId, isSecure: isSecure};
	}

var disconnectionListener = function(connectionId, serverId, isSecure)
	{
	if(connectionId in connections)
		delete connections[connectionId];
	}

	// EXPOSED RPC METHODS -- -- -- -- -- -- -- -- -- -- //
var registerService = fibrous( function(service_name)
	{
	// ALLOW REGISTRATION FROM APPLICATIONS ONLY - STARTED CONTAINERS (APPLICATIONS) HAVE AN IP THAT IDENTIFIES THEM
	var applicationIp = get("getApplicationByIp", arguments[arguments.length-1].remoteAddress);

	if(!applicationIp)
		throw language.E_REGISTER_SERVICE_UNKNOWN_ADDRESS.preFmt("Core::registerService", {"~address": arguments[arguments.length-1].remoteAddress});

	// APPLICATION CAN REGISTER ONLY ITS OWN SERVICES = SERVICE NAME FOUND IN ITS SERVICES
	var service = securityModel.registerService(applicationIp, service_name);
	if(!service)
		throw language.E_REGISTER_SERVICE_UNKNOWN_SERVICE_NAME.preFmt("Core::registerService", {"~name": service_name});

	return service;
	});

var unregisterService = fibrous( function(service_name)
	{
	// ALLOW UNREGISTRATION FROM APPLICATIONS ONLY - STARTED CONTAINERS (APPLICATIONS) HAVE AN IP THAT IDENTIFIES THEM
	var applicationIp = get("getApplicationByIp", arguments[arguments.length-1].remoteAddress);

	if(!applicationIp)
		throw language.E_UNREGISTER_SERVICE_UNKNOWN_ADDRESS.pre("Core::unregisterService", {address: arguments[arguments.length-1].remoteAddress});

	// APPLICATION CAN UNREGISTER ONLY ITS OWN SERVICES = SERVICE NAME FOUND IN THE SERVICES
	var service = securityModel.unregisterService(applicationIp, service_name);
	if(!service)
		throw language.E_UNREGISTER_SERVICE_UNKNOWN_SERVICE_NAME.pre("Core::unregisterService", {name: service_name});

	return service;
	});

var getService = fibrous( function(service_name, unique_name)
	{ // Get either by service name or service name and unique_name
	var application;
	var applicationIp;
	var runtimeService;
	var service = null;

	if(unique_name)
		{
		application = get("getApplication", unique_name);
		if(!application)
			throw language.E_APPLICATION_NOT_INSTALLED.preFmt("Core::getService", {"~name": unique_name});
		}

	applicationIp = get("getApplicationByIp", arguments[arguments.length-1].remoteAddress);
	runtimeService = get("getRuntimeService", {service_name: service_name, unique_name: unique_name});

	if(!runtimeService)
		throw language.E_GET_SERVICE_UNKNOWN_SERVICE.preFmt("Core::getService", {"~name": service_name});

	return securityModel.getService(runtimeService, applicationIp, arguments[arguments.length-1].remoteAddress);
	});

var getOpenServices = fibrous( function(unique_names)
	{ // Get all the open and allowed open_local runtime services from all the unique applications in the list
	var application;
	var runtimeServices = [];

	for(var i = 0; i < unique_names.length; i++)
		{
		application = get("getApplication", unique_names[i]);
		if(!application)
			throw language.E_APPLICATION_NOT_INSTALLED.preFmt("Core::getOpenServices", {"~name": unique_name});

		runtimeServices = get("getRuntimeServices", unique_names[i]);

		runtimeServices = runtimeServices.concat( securityModel.getOpenServices(runtimeServices, arguments[arguments.length-1].remoteAddress) );
		}

	return runtimeServices;
	});

var adminLogIn = fibrous( function(password)
	{
	return securityModel.sync.adminLogIn(password, arguments[arguments.length-1].remoteAddress);
	});

var adminLogOut = fibrous( function(sessionId)
	{
	securityModel.sync.adminLogOut(sessionId, arguments[arguments.length-1].remoteAddress);

	return true;
	});

var isAdminLoggedIn = fibrous( function(sessionId)
	{
	securityModel.sync.isLocalSession(arguments[arguments.length-1].remoteAddress, null, true/*throws*/);

	var session = securityModel.sync.findSession(sessionId);

	return (session ? true : false);
	});

var setSplashAccepted = fibrous( function()
	{
	try {
		var lease = dhcpdlog.getDHCPLeaseByIP(arguments[arguments.length-1].remoteAddress);	// Lease must exist for the device

		if(!lease)
			throw language.E_UNKNOWN_MAC.pre("Core::setSplashAccepted");

		if(!iptables.sync.splashAddRule(lease.macOrDuid))										// Add MAC to the iptables rules
			throw language.E_SET_SPLASH_ACCEPTED_FAILED.pre("Core::setSplashAccepted");

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
		throw errorc.make(err);
		}

	return true;
	});

var startSpacelet = fibrous( function(unique_name)
	{
	var spacelet = null;
	var startObject = {};
	var openRuntimeServices = [];

	try {
		if(securityModel.isApplicationIP(arguments[arguments.length-1].remoteAddress))
			throw language.E_START_SPACELET_APPLICATIONS_CAN_NOT_START_SPACELETS.pre("Core::startSpacelet");

		if(!securityModel.sameOriginPolicyStartSpacelet(getManifest.sync(unique_name), arguments[arguments.length-1].origin))
			throw language.E_START_SPACELET_SSOP.pre("Core::startSpacelet");

		spaceletManager.sync.install(unique_name, true);
		startObject = spaceletManager.sync.start(unique_name, true);

		openRuntimeServices = securityModel.getOpenServices(startObject.providesServices);

		// Events
		startObject.manifest = getManifest.sync(unique_name, false);
		startObject.openRuntimeServices = openRuntimeServices;
		delete startObject.providesServices;

		callEvent(config.EVENT_SPACELET_STARTED, startObject);
		}
	catch(err)
		{
		throw language.E_START_SPACELET_FAILED.pre("Core::startSpacelet", err);
		}

	return openRuntimeServices;
	});

var installApplication = fibrous( function(unique_name, type, sessionId, throws)
	{ // Install (insert) application or spacelet to cores list of applications or spacelets
	var event;

	try {
		securityModel.sync.isLocalSession(arguments[arguments.length-1].remoteAddress, sessionId, true/*throws*/);

		securityModel.refreshLogInSession(sessionId);

		getManager(type).sync.install(unique_name, true);

		// Events
		if(type == config.SPACELET)
			event = config.EVENT_SPACELET_INSTALLED;
		else if(type == config.SANDBOXED)
			event = config.EVENT_APPLICATION_INSTALLED;
		else if(type == config.NATIVE)
			event = config.EVENT_NATIVE_APPLICATION_INSTALLED;

		callEvent(event, { manifest: getManifest.sync(unique_name, false) });
		}
	catch(err)
		{
		if(throws)
			throw err;
		}

	return true;
	});

var removeApplication = fibrous( function(unique_name, sessionId, throws)
	{ // Removes, and when necessary stops, application or spacelet and removes it from cores lists
	var event;
	var manifest;
	var application;

	try {
		securityModel.sync.isLocalSession(arguments[arguments.length-1].remoteAddress, sessionId, true/*throws*/);

		securityModel.refreshLogInSession(sessionId);

		// REMOVE APPLICATION
		if(!(application = get("getApplication", unique_name)))
			throw language.E_APPLICATION_NOT_INSTALLED.preFmt("Core::removeApplication", {"~name": unique_name});

		manifest = getManifest.sync(unique_name, false);

		getManager(application.getType()).sync.remove(unique_name);

		// Events
		if(manifest.type == config.SPACELET)
			event = config.EVENT_SPACELET_REMOVED;
		else if(manifest.type == config.SANDBOXED)
			event = config.EVENT_APPLICATION_REMOVED;
		else if(manifest.type == config.NATIVE)
			event = config.EVENT_NATIVE_APPLICATION_REMOVED;

		callEvent(event, { manifest: manifest });
		}
	catch(err)
		{
		if(throws)
			throw err;
		}

	return true;
	});

var startApplication = fibrous( function(unique_name, sessionId, throws)
	{ // Start application or spacelet
	var event;
	var application;
	var startObject = {};

	try {
		securityModel.sync.isLocalSession(arguments[arguments.length-1].remoteAddress, sessionId, true/*throws*/);

		securityModel.refreshLogInSession(sessionId);

		// START APPLICATION
		if(!(application = get("getApplication", unique_name)))
			throw language.E_APPLICATION_NOT_INSTALLED.preFmt("Core::startApplication", {"~name": unique_name});

		if(isApplicationRunning.sync(unique_name))
			throw language.PACKAGE_ALREADY_RUNNING.preFmt("Core::startApplication", {"~type": language.APP_DISPLAY_NAMES[app.type], "~name": unique_name});

		startObject = getManager(application.getType()).sync.start(unique_name);

		// Events
		if(application.getType() == config.SPACELET)
			event = config.EVENT_SPACELET_STARTED;
		else if(application.getType() == config.SANDBOXED)
			event = config.EVENT_APPLICATION_STARTED;
		else if(application.getType() == config.NATIVE)
			event = config.EVENT_NATIVE_APPLICATION_STARTED;

		startObject.manifest = getManifest.sync(unique_name, false);
		startObject.openRuntimeServices = securityModel.getOpenServices(startObject.providesServices, arguments[arguments.length-1].remoteAddress);
		delete startObject.providesServices;

		callEvent(event, startObject);
		}
	catch(err)
		{
		if(throws)
			throw err;
		}

	return true;
	});

var stopApplication = fibrous( function(unique_name, sessionId, throws)
	{ // Stops application or spacelet
	var event;
	var manifest;
	var application;

	try {
		securityModel.sync.isLocalSession(arguments[arguments.length-1].remoteAddress, sessionId, true/*throws*/);

		securityModel.refreshLogInSession(sessionId);

		// STOP APPLICATION
		if(!(application = get("getApplication", unique_name)))
			throw language.E_APPLICATION_NOT_INSTALLED.preFmt("Core::stopApplication", {"~name": unique_name});

		getManager(application.getType()).sync.stop(unique_name);

		// Events
		manifest = getManifest.sync(unique_name, false);

		if(manifest.type == config.SPACELET)
			event = config.EVENT_SPACELET_STOPPED;
		else if(manifest.type == config.SANDBOXED)
			event = config.EVENT_APPLICATION_STOPPED;
		else if(manifest.type == config.NATIVE)
			event = config.EVENT_NATIVE_APPLICATION_STOPPED;

		callEvent(event, { manifest: manifest });
		}
	catch(err)
		{
		if(throws)
			throw err;
		}

	return true;
	});

var isApplicationRunning = fibrous( function(unique_name)
	{ // Is application or spacelet running
	return get("isRunning", unique_name);
	});

var getApplicationData = fibrous( function()
	{ // Get application and spacelet data
	var i;
	var appDir = "";
	var manifest = null;
	var dbSpacelet, dbSandboxed, dbNative;
	var appData = { spacelet: [], sandboxed: [], native: [] };

	try { dbSpacelet = database.sync.getApplications([config.SPACELET]); } catch(err) { dbSpacelet = []; }
	try { dbSandboxed = database.sync.getApplications([config.SANDBOXED]); } catch(err) { dbSandboxed = []; }
	try { dbNative = database.sync.getApplications([config.NATIVE]); } catch(err) { dbNative = []; }
	database.close();

	for(i = 0; i < dbSpacelet.length; i++)
		{
		if((manifest = getManifest.sync(dbSpacelet[i].unique_name, false)))
			{
			appDir = config.SPACELETS_PATH + dbSpacelet[i].unique_directory + config.VOLUME_DIRECTORY + config.APPLICATION_DIRECTORY;

			manifest.hasTile = utility.sync.isLocal(appDir + config.WWW_DIRECTORY + config.TILEFILE, "file");
			manifest.isRunning = spaceletManager.isRunning(manifest.unique_name);

			appData.spacelet.push(manifest);
			}
		}

	for(i = 0; i < dbSandboxed.length; i++)
		{
		if((manifest = getManifest.sync(dbSandboxed[i].unique_name, false)))
			{
			appDir = config.SANDBOXED_PATH + dbSandboxed[i].unique_directory + config.VOLUME_DIRECTORY + config.APPLICATION_DIRECTORY;

			manifest.hasTile = utility.sync.isLocal(appDir + config.WWW_DIRECTORY + config.TILEFILE, "file");
			manifest.isRunning = sandboxedManager.isRunning(manifest.unique_name);

			appData.sandboxed.push(manifest);
			}
		}

	for(i = 0; i < dbNative.length; i++)
		{
		if((manifest = getManifest.sync(dbNative[i].unique_name, false)))
			{
			appDir = config.NATIVE_PATH + dbNative[i].unique_directory + config.VOLUME_DIRECTORY + config.APPLICATION_DIRECTORY;

			manifest.hasTile = utility.sync.isLocal(appDir + config.WWW_DIRECTORY + config.TILEFILE, "file");
			manifest.isRunning = nativeManager.isRunning();

			appData.native.push(utility.parseJSON(manifest), true);
			}
		}

	return appData;
	});

var getApplicationURL = fibrous( function(unique_name)
	{ // Get application or spacelet URL
	try {
		var type = get("getType", unique_name);
		var isRunning = get("isRunning", unique_name);
		var implementsWebServer = get("implementsWebServer", unique_name);
		var httpService = get("getRuntimeService", {service_name: config.HTTP, unique_name: unique_name});
		var port, securePort, url, secureUrl;

		if(implementsWebServer && isRunning && httpService)								// Use applications internal server
			{
			port = httpService.port;
			securePort = httpService.securePort;
			url = config.EDGE_HOSTNAME + ":" + port;
			secureUrl = config.EDGE_HOSTNAME + ":" + securePort;
			}
		else																			// Use cores web server
			{
			port = null;
			securePort = null;
			url = config.EDGE_HOSTNAME;
			secureUrl = config.EDGE_HOSTNAME;
			}
		}
	catch(err)
		{
		throw language.E_GET_APPLICATION_URL_FAILED.pre("Core::getApplicationURL", err);
		}

	return	{
			url: url, secureUrl: secureUrl, port: port, securePort: securePort,
			implementsWebServer: implementsWebServer, isRunning: isRunning, unique_name: unique_name, type: type
			};
	});

var getManifest = fibrous( function(unique_name, throws)
	{ // Get application or spacelet manifest
	// TRY TO GET THE MANIFEST
	var manifest = get("getManifest", unique_name);

	if(!manifest && throws)
		throw language.E_GET_MANIFEST_FAILED.preFmt("Core::getManifest", {"~name": unique_name});

	return manifest;
	});

/*var connectTo = fibrous( function(service_name, isSecure)
	{
	});*/

var getServiceRuntimeStates = fibrous( function(sessionId)
	{ // Get application or spacelet runtime services
	var status = {spacelet: {}, sandboxed: {}, native: {}};

	try {
		securityModel.sync.isLocalSession(arguments[arguments.length-1].remoteAddress, sessionId, true/*throws*/);

		securityModel.refreshLogInSession(sessionId);

		// GET SERVICE RUNTIME STATES
		status.spacelet = spaceletManager.getServiceRuntimeStates();

		status.sandboxed = sandboxedManager.getServiceRuntimeStates();

		status.native = nativeManager.getServiceRuntimeStates();
		}
	catch(err)
		{
		throw language.E_GET_SERVICE_RUNTIME_STATES_FAILED.pre("Core::getServiceRuntimeStates", err);
		}

	return status;
	});

var getCoreSettings = fibrous( function(sessionId)
	{
	var settings = {};

	try {
		securityModel.sync.isLocalSession(arguments[arguments.length-1].remoteAddress, sessionId, true/*throws*/);

		securityModel.refreshLogInSession(sessionId);

		settings = database.sync.getCoreSettings();
		}
	catch(err)
		{
		throw language.E_GET_CORE_SETTINGS_FAILED.pre("Core::getCoreSettings", err);
		}
	finally
		{
		database.close();
		}

	return settings;
	});

var saveCoreSettings = fibrous( function(settings, sessionId)
	{
	try {
		securityModel.sync.isLocalSession(arguments[arguments.length-1].remoteAddress, sessionId, true/*throws*/);

		securityModel.refreshLogInSession(sessionId);

		database.sync.saveCoreSettings(settings);								// Save to database and update to security model
		securityModel.setCoreSettings(settings);

		callEvent(config.EVENT_CORE_SETTINGS_CHANGED, settings);
		}
	catch(err)
		{
		throw language.E_SAVE_CORE_SETTINGS_FAILED.pre("Core::saveCoreSettings", err);
		}
	finally
		{
		database.close();
		}

	return true;
	});

var getEdgeSettings = fibrous( function(sessionId)
	{
	var settings = {};

	try {
		securityModel.sync.isLocalSession(arguments[arguments.length-1].remoteAddress, sessionId, true/*throws*/);

		securityModel.refreshLogInSession(sessionId);

		settings = database.sync.getEdgeSettings();
		}
	catch(err)
		{
		throw language.E_GET_EDGE_SETTINGS_FAILED.pre("Core::getEdgeSettings", err);
		}
	finally
		{
		database.close();
		}

	return	{
			edge_id: settings.edge_id, edge_name: settings.edge_name, edge_enable_remote: settings.edge_enable_remote,
			edge_require_password: settings.edge_require_password, admin_login_count: settings.admin_login_count,
			admin_last_login: securityModel.getAdminLastLogin()
			};
	});

var saveEdgeSettings = fibrous( function(settings, sessionId)
	{
	try {
		securityModel.sync.isLocalSession(arguments[arguments.length-1].remoteAddress, sessionId, true/*throws*/);

		securityModel.refreshLogInSession(sessionId);

		delete settings.edge_password;
		delete settings.edge_salt;
		delete settings.admin_password;
		delete settings.admin_salt;
		delete settings.admin_login_count;
		delete settings.admin_last_login;

		var edge_enable_remote = parseInt(settings.edge_enable_remote);
		var edge_require_password = parseInt(settings.edge_require_password);

		if(edge_enable_remote != 0 && edge_enable_remote != 1)
			settings.edge_enable_remote = 0;

		if(edge_require_password != 0 && edge_require_password != 1)
			settings.edge_require_password = 0;

		database.sync.saveEdgeSettings(settings);								// Save to database and update to security model
		//securityModel.setEdgeSettings(settings);

		callEvent(config.EVENT_EDGE_SETTINGS_CHANGED, settings);
		}
	catch(err)
		{
		throw language.E_SAVE_EDGE_SETTINGS_FAILED.pre("Core::saveEdgeSettings", err);
		}
	finally
		{
		database.close();
		}

	return true;
	});

self.registerEdge = fibrous( function()
	{
	var result;
	var parts = [];
	var edgeIdFile;

	try {
		if(utility.sync.isLocal(config.SPACEIFY_REGISTRATION_FILE, "file"))
			{
			edgeIdFile = fs.sync.readFile(config.SPACEIFY_REGISTRATION_FILE, {encoding: "utf8"});
			parts = edgeIdFile.split(",");

			result = utility.sync.postRegister(parts[0], parts[1]);

			if(typeof result == "number")																// Other than 200 OK was received?
				throw language.E_REGISTER_EDGE_FAILED.preFmt("Core::register", {"~result": result,
					"~httpStatus": "(" + (httpStatus[result] ? httpStatus[result].message : httpStatus["unknown"].message) + ")"});
			else if(result != "")
				throw language.E_REGISTER_EDGE_FAILED.preFmt("Core::register", {"~result": result});
			}
		}
	catch(err)
		{
		throw err;
		}

	return true;
	});

/**
 * Client connections can register themselves as event listeners. Event listeners are implemented as exposed RPC methods on the clients side.
 *
 */
var setEventListeners = fibrous( function(events, sessionId)
	{
	var connObj = arguments[arguments.length-1];								// This connection exposes some event listeners

	var isLocalSession = securityModel.sync.isLocalSession(connObj.remoteAddress, sessionId, false/*!throws*/);

	for(var i = 0; i < events.length; i++)										// Set the event listeners for the connection
		{
		if(events[i] == config.EVENT_EDGE_SETTINGS_CHANGED && isLocalSession)
			connections[connObj.connectionId].events.push(events[i]);
		else if(events[i] == config.EVENT_CORE_SETTINGS_CHANGED && isLocalSession)
			connections[connObj.connectionId].events.push(events[i]);
		else if(events[i] == config.EVENT_APPLICATION_INSTALLED ||
				events[i] == config.EVENT_APPLICATION_REMOVED ||
				events[i] == config.EVENT_APPLICATION_STARTED ||
				events[i] == config.EVENT_APPLICATION_STOPPED ||
				events[i] == config.EVENT_SPACELET_INSTALLED ||
				events[i] == config.EVENT_SPACELET_REMOVED ||
				events[i] == config.EVENT_SPACELET_STARTED ||
				events[i] == config.EVENT_SPACELET_STOPPED ||
				events[i] == config.EVENT_NATIVE_APPLICATION_INSTALLED ||
				events[i] == config.EVENT_NATIVE_APPLICATION_REMOVED ||
				events[i] == config.EVENT_NATIVE_APPLICATION_STARTED ||
				events[i] == config.EVENT_NATIVE_APPLICATION_STOPPED)
			connections[connObj.connectionId].events.push(events[i]);
		}

	return true;
	});

/*var saveOptions = fibrous( function(sessionId, unique_name, directory, file, data)
	{
	var dbApp;
	var volume;
	var optionsOk = false;
	var session = securityModel.findSession(sessionId);

	try {
		if(!session || session.ip != arguments[arguments.length-1].remoteAddress)		// Accept only from the same ip (= logged in device)
			throw language.E_INVALID_SESSION.pre("Core::saveOptions");

		dbApp = database.sync.getApplication(unique_name) || null;						// Get application, path to volume, create directory and save
		if(!dbApp)
			throw language.E_APPLICATION_NOT_INSTALLED.preFmt("Core::saveOptions", {"~name": unique_name});

		volume = "";
		if(dbApp.type == config.SPACELET)
			volume = config.SPACELETS_PATH + dbApp.unique_directory + config.VOLUME_DIRECTORY;
		else if(dbApp.type == config.SANDBOXED)
			volume = config.SANDBOXED_PATH + dbApp.unique_directory + config.VOLUME_DIRECTORY;
		else if(dbApp.type == config.NATIVE)
			volume = config.NATIVEAPPS_PATH + dbApp.unique_directory + config.VOLUME_DIRECTORY;

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
		throw errorc.make(err);
		}
	finally
		{
		database.close();
		}

	return optionsOk;
	});

var loadOptions = fibrous( function(sessionId, unique_name, directory, file)
	{
	var data;
	var dbApp;
	var volume;
	var data = null;
	var session = securityModel.findSession(sessionId);

	try {
		if(!session || session.ip != arguments[arguments.length-1].remoteAddress)		// Accept only from the same ip (= logged in device)
			throw language.E_INVALID_SESSION.pre("Core::loadOptions");

		dbApp = database.sync.getApplication(unique_name) || null;						// Get application, path to volume and load
		if(!dbApp)
			throw language.E_APPLICATION_NOT_INSTALLED.preFmt("Core::loadOptions", {"~name": unique_name});

		volume = "";
		if(dbApp.type == config.SPACELET)
			volume = config.SPACELETS_PATH + dbApp.unique_directory + config.VOLUME_DIRECTORY;
		else if(dbApp.type == config.SANDBOXED)
			volume = config.SANDBOXED_PATH + dbApp.unique_directory + config.VOLUME_DIRECTORY;
		else if(dbApp.type == config.NATIVE)
			volume = config.NATIVE_PATH + dbApp.unique_directory + config.VOLUME_DIRECTORY;

		if(directory != "")
			directory += (directory.search(/\/$/) != -1 ? "" : "/");

		data = fs.sync.readFile(volume + directory + file, {encoding: "utf8"});
		}
	catch(err)
		{
		throw errorc.make(err);
		}
	finally
		{
		database.close();
		}

	return data;
	});*/

	// PRIVATE -- -- -- -- -- -- -- -- -- -- //
var get = function(method, search)
	{
	var result = spaceletManager[method](search);

	if(result == null)
		result = sandboxedManager[method](search);

	if(result == null)
		result = nativeManager[method](search);

	return result;
	}

var getManager = function(type)
	{
	var manager = null;

	if(type == config.SPACELET)
		manager = spaceletManager;
	else if(type == config.SANDBOXED)
		manager = sandboxedManager;
	else if(type == config.NATIVE)
		manager = nativeManager;

	return manager;
	}

/**
 * Call the event listeners exposed by connections (see setEventListeners).
 */
var callEvent = function(event)
	{
	var data = [];

	for(var i = 1; i < arguments.length; i++)
		data.push(arguments[i]);

	for(var id in connections)
		{
		if(connections[id].events.indexOf(event) != -1)
			servers[connections[id].serverId].callRpc(event, data, null, null, id);
		}
	}
}

module.exports = Core;
