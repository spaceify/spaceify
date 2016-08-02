/**
 * Spaceify core, 2.9.2013 Spaceify Oy
 * 
 * @class Core
 */

var fs = require("fs");
var mkdirp = require("mkdirp");
var fibrous = require("fibrous");
var Manager = require("./manager");
var DHCPDLog = require("./dhcpdlog");
var Iptables = require("./iptables");
var language = require("./language");
var Database = require("./database");
var Logger = require("./logger");
var ConnectionHub = require("./connectionhub");
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
//var nativeManager = new Manager();
var spaceletManager = new Manager();
var sandboxedManager = new Manager();
var securityModel = new SecurityModel();
var connectionHub = new ConnectionHub();

var settings = null;
var isLoggedInToSpaceifyNet = false;

var servers = [];
var key = config.SPACEIFY_TLS_PATH + config.SERVER_KEY;
var crt = config.SPACEIFY_TLS_PATH + config.SERVER_CRT;
var caCrt = config.SPACEIFY_WWW_PATH + config.SPACEIFY_CRT;

	// CONNECTION -- -- -- -- -- -- -- -- -- -- //
self.connect = fibrous( function()
	{
	var types = [{port: config.CORE_PORT, isSecure: false}, {port: config.CORE_PORT_SECURE, isSecure: true}];

	for(var i = 0; i < types.length; i++)														// Setup/open the servers
		{
		var webSocketRpcServer = new WebSocketRpcServer();
		servers.push(webSocketRpcServer);

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
		webSocketRpcServer.exposeRpcMethod("connectTo", self, connectTo);
		webSocketRpcServer.exposeRpcMethod("setSplashAccepted", self, setSplashAccepted);

		// THESE ARE EXPOSED ONLY OVER A SECURE CONNECTION!!!
		if(types[i].isSecure)
			{
			webSocketRpcServer.exposeRpcMethod("adminLogIn", self, adminLogIn);
			webSocketRpcServer.exposeRpcMethod("adminLogOut", self, adminLogOut);
			webSocketRpcServer.exposeRpcMethod("isAdminLoggedIn", self, isAdminLoggedIn);
			webSocketRpcServer.exposeRpcMethod("startApplication", self, startApplication);
			webSocketRpcServer.exposeRpcMethod("stopApplication", self, stopApplication);
			webSocketRpcServer.exposeRpcMethod("removeApplication", self, removeApplication);
			webSocketRpcServer.exposeRpcMethod("getSettings", self, getSettings);
			webSocketRpcServer.exposeRpcMethod("saveSettings", self, saveSettings);
			webSocketRpcServer.exposeRpcMethod("getServiceRuntimeStates", self, getServiceRuntimeStates);
			//webSocketRpcServer.exposeRpcMethod("saveOptions", self, saveOptions);
			//webSocketRpcServer.exposeRpcMethod("loadOptions", self, loadOptions);
			}

		webSocketRpcServer.sync.listen({	hostname: config.ALL_IPV4_LOCAL, port: types[i].port,
											isSecure: types[i].isSecure, key: key, crt: crt, caCrt: caCrt,
											keepUp: true, debug: true });
		}

	// Build and/or start applications
	try { sandboxedManager.sync.start({type: config.SANDBOXED, unique_name: null, throwErros: false}); } catch(err) {}
	try { spaceletManager.sync.start({type: config.SPACELET, unique_name: null, throwErros: false, runSpacelet: false}); } catch(err) {}
	try { nativeManager.sync.start({type: config.NATIVE, unique_name: null, throwErrors: false}); } catch(err) {}

	// Get settings from the database
	settings = database.sync.getSettings();
	securityModel.setSettings(settings);
	});

self.close = fibrous( function()
	{
	spaceletManager.sync.removeAll();
	sandboxedManager.sync.removeAll();
	//nativeManager.sync.removeAll();

	for(var i = 0; i < servers.length; i++)
		servers[i].close();
	});

	// EXPOSED RPC METHODS -- -- -- -- -- -- -- -- -- -- //
var startSpacelet = fibrous( function(unique_name)
	{
	var spacelet = null, runtimeServices = [];

	if(securityModel.isApplicationIP(arguments[arguments.length-1].remoteAddress))
		throw language.E_APPLICATION_CAN_NOT_START_SPACELET.pre("Core::startSpacelet");

	if(!securityModel.sameOriginPolicyStartSpacelet(getManifest.sync(unique_name), arguments[arguments.length-1].origin))
		throw language.E_SSOP_START_SPACELET.pre("Core::startSpacelet");

	try {
		spacelet = spaceletManager.sync.start({type: config.SPACELET, unique_name: unique_name, throwErros: true, runSpacelet: true});
		}
	catch(err)
		{
		throw language.E_FAILED_TO_START_SPACELET.pre("Core::startSpacelet", err);
		}

	if(spacelet)
		runtimeServices = securityModel.getOpenServices(spacelet.getProvidesServices());

	return runtimeServices;
	});

var registerService = fibrous( function(service_name)
	{
	// ALLOW REGISTRATION FROM APPLICATIONS ONLY - STARTED CONTAINERS (APPLICATIONS) HAVE AN IP THAT IDENTIFIES THEM
	var getApplicationByIp = get("getApplicationByIp", arguments[arguments.length-1].remoteAddress);

	if(!getApplicationByIp)
		throw language.E_REGISTER_SERVICE_UNKNOWN_ADDRESS.preFmt("Core::registerService", {"~address": arguments[arguments.length-1].remoteAddress});

	// APPLICATION CAN REGISTER ONLY ITS OWN SERVICES = SERVICE NAME FOUND IN ITS SERVICES
	var service = securityModel.registerService(getApplicationByIp, service_name);
	if(!service)
		throw language.E_REGISTER_SERVICE_UNKNOWN_SERVICE_NAME.preFmt("Core::registerService", {"~name": service_name});

	return service;
	});

var unregisterService = fibrous( function(service_name)
	{
	// ALLOW UNREGISTRATION FROM APPLICATIONS ONLY - STARTED CONTAINERS (APPLICATIONS) HAVE AN IP THAT IDENTIFIES THEM
	var getApplicationByIp = get("getApplicationByIp", arguments[arguments.length-1].remoteAddress);

	if(!getApplicationByIp)
		throw language.E_UNREGISTER_SERVICE_UNKNOWN_ADDRESS.pre("Core::unregisterService", {address: arguments[arguments.length-1].remoteAddress});

	// APPLICATION CAN UNREGISTER ONLY ITS OWN SERVICES = SERVICE NAME FOUND IN THE SERVICES
	var service = securityModel.unregisterService(getApplicationByIp, service_name);
	if(!service)
		throw language.E_UNREGISTER_SERVICE_UNKNOWN_SERVICE_NAME.pre("Core::unregisterService", {name: service_name});

	return service;
	});

var getService = fibrous( function(service_name, unique_name)
	{ // Get either by service name or service name and unique_name
	var service = null;

	if(unique_name)
		{
		var getApplication = get("getApplication", unique_name);
		if(!getApplication)
			throw language.E_APPLICATION_NOT_INSTALLED.preFmt("Core::getService", {"~name": unique_name});
		}

	var getApplicationByIp = get("getApplicationByIp", arguments[arguments.length-1].remoteAddress);
	var getRuntimeService = get("getRuntimeService", {service_name: service_name, unique_name: unique_name});

	if(!getRuntimeService)
		throw language.E_GET_SERVICE_UNKNOWN.preFmt("Core::getService", {"~name": service_name});

	return securityModel.getService(getRuntimeService, getApplicationByIp, arguments[arguments.length-1].remoteAddress);
	});

var getOpenServices = fibrous( function(unique_names)
	{ // Get all the open and allowed open_local runtime services from all the unique applications in the list
	var runtimeServices = [];

	for(var i = 0; i < unique_names.length; i++)
		{
		var getApplication = get("getApplication", unique_names[i]);
		if(!getApplication)
			throw language.E_APPLICATION_NOT_INSTALLED.preFmt("Core::getOpenServices", {"~name": unique_name});

		var getRuntimeServices = get("getRuntimeServices", unique_names[i]);

		runtimeServices = runtimeServices.concat( securityModel.getOpenServices(getRuntimeServices, arguments[arguments.length-1].remoteAddress) );
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
	securityModel.sync.checkCallerRights(arguments[arguments.length-1].remoteAddress, null);	// Throws

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
			throw language.E_SPLASH_ADD_FAILED.pre("Core::setSplashAccepted");

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

var startApplication = fibrous( function(unique_name, run, sessionId, throws)
	{
	try {
		securityModel.sync.checkCallerRights(arguments[arguments.length-1].remoteAddress, sessionId);	// Throws

		securityModel.refreshLogInSession(sessionId);

		// START APPLICATION
		var app = database.sync.getApplication(unique_name);
		if(!app && throws)
			throw language.E_APPLICATION_NOT_INSTALLED.preFmt("Core::startApplication", {"~name": unique_name});

		if(isApplicationRunning.sync(unique_name))
			throw language.PACKAGE_ALREADY_RUNNING.preFmt("Core::startApplication", {"~type": config.APP_TYPES_HR[app.type], "~name": unique_name});

		if(app && app.type == config.SANDBOXED)
			sandboxedManager.sync.start({type: config.SANDBOXED, unique_name: unique_name, throwErros: true});
		else if(app && app.type == config.SPACELET)
			spaceletManager.sync.start({type: config.SPACELET, unique_name: unique_name, throwErros: true, runSpacelet: run});
		/*else if(app && app.type == config.NATIVE)
			nativeManager.sync.start({type: config.NATIVE, unique_name: unique_name, throwErrors: true});*/
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

var stopApplication = fibrous( function(unique_name, sessionId, throws)
	{
	securityModel.sync.checkCallerRights(arguments[arguments.length-1].remoteAddress, sessionId);	// Throws

	securityModel.refreshLogInSession(sessionId);

	// STOP APPLICATION
	var getApplication = get("getApplication", unique_name);
	if(!getApplication && throws)
		throw language.E_APPLICATION_NOT_INSTALLED.preFmt("Core::stopApplication", {"~name": unique_name});

	if(getApplication)
		//getApplication.manager.sync.stop(unique_name);
		getManager(getApplication.getType()).sync.stop(unique_name);

	return true;
	});

var removeApplication = fibrous( function(unique_name, sessionId, throws)
	{ // Stops application or spacelet, if its running, and then removes it from core's list of applications or spacelets. This method does not remove the applications or spacelets installation.
	securityModel.sync.checkCallerRights(arguments[arguments.length-1].remoteAddress, sessionId);	// Throws

	securityModel.refreshLogInSession(sessionId);

	// REMOVE APPLICATION
	var getApplication = get("getApplication", unique_name);
	if(!getApplication && throws)
		throw language.E_APPLICATION_NOT_INSTALLED.preFmt("Core::removeApplication", {"~name": unique_name});

	if(getApplication)
		getManager(getApplication.getType()).sync.remove(unique_name);

	return true;
	});

var isApplicationRunning = fibrous( function(unique_name)
	{
	var isRunning = get("isRunning", unique_name);

	return isRunning;
	});

var getApplicationData = fibrous( function()
	{
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

	/*for(i = 0; i < dbNative.length; i++)
		{
		if((manifest = getManifest.sync(dbNative[i].unique_name, false)))
			{
			appDir = config.NATIVE_PATH + dbNative[i].unique_directory + config.VOLUME_DIRECTORY + config.APPLICATION_DIRECTORY;

			manifest.hasTile = utility.sync.isLocal(appDir + config.WWW_DIRECTORY + config.TILEFILE, "file");
			manifest.isRunning = nativeManager.isRunning();

			appData.native.push(utility.parseJSON(manifest), true);
			}
		}*/

	return appData;			//throw language.E_GET_APP_DATA_FAILED.pre("Core::getApplicationData", err); }
	});

var getApplicationURL = fibrous( function(unique_name)
	{
	try {
		var getType = get("getType", unique_name);
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
		throw language.E_GET_APP_URL_FAILED.pre("Core::getApplicationURL", err);
		}

	return	{
			url: url, secureUrl: secureUrl, port: port, securePort: securePort,
			implementsWebServer: implementsWebServer, isRunning: isRunning, unique_name: unique_name, type: getType
			};
	});

var getManifest = fibrous( function(unique_name, throws)
	{
	var service = null;

	// TRY TO GET THE MANIFEST
	var getManifest = get("getManifest", unique_name);

	if(!getManifest && throws)
		throw language.E_GET_MANIFEST_NOT_FOUND.preFmt("Core::getManifest", {"~name": unique_name});

	return getManifest;
	});

var connectTo = fibrous( function(service_name, isSecure)
	{

	});

var getServiceRuntimeStates = fibrous( function(sessionId)
	{
	var status = {spacelet: {}, sandboxed: {}, native: {}};

	securityModel.sync.checkCallerRights(arguments[arguments.length-1].remoteAddress, sessionId);	// Throws

	securityModel.refreshLogInSession(sessionId);

	// GET SERVICE RUNTIME STATES
	status.spacelet = spaceletManager.getServiceRuntimeStates();

	status.sandboxed = sandboxedManager.getServiceRuntimeStates();

	//status.native = nativeManager.getServiceRuntimeStates();

	return status;
	});

var getSettings = fibrous( function(sessionId)
	{
	var settings = null;

	securityModel.sync.checkCallerRights(arguments[arguments.length-1].remoteAddress, sessionId);	// Throws

	securityModel.refreshLogInSession(sessionId);

	// GET SETTINGS
	return database.sync.getSettings();
	});

var saveSettings = fibrous( function(newSettings, sessionId)
	{
	try {
		securityModel.sync.checkCallerRights(arguments[arguments.length-1].remoteAddress, sessionId);	// Throws

		securityModel.refreshLogInSession(sessionId);

		// SAVE SETTINGS
		var settings = database.sync.getSettings();

		for(var i in settings)													// Check object
			{
			if(!(i in newSettings))
				throw language.E_SETTINGS_PROPERTY.preFmt("Core::saveSettings", {"~property": i});

			if(typeof newSettings[i] != typeof settings[i])
				throw language.E_SETTINGS_DATATYPE.preFmt("Core::saveSettings", {"~property": i, "~datatype": typeof settings[i]});
			}

		database.sync.saveSettings(newSettings);								// Save to database and update to security model
		securityModel.setSettings(newSettings);
		}
	catch(err)
		{
		throw language.E_FAILED_TO_SAVE_SETTINGS.pre("Core::saveSettings", err);
		}
	finally
		{
		database.close();
		}

	return true;
	});

	// APPLICATION -- -- -- -- -- -- -- -- -- -- //
/*var saveOptions = fibrous( function(sessionId, unique_name, directory, file, data)
	{
	var optionsOk = false;
	var session = securityModel.findSession(sessionId);

	try {
		if(!session || session.ip != arguments[arguments.length-1].remoteAddress)		// Accept only from the same ip (= logged in device)
			throw language.E_INVALID_SESSION.pre("Core::saveOptions");

		var dbApp = database.sync.getApplication(unique_name) || null;					// Get application, path to volume, create directory and save
		if(!dbApp)
			throw language.E_APPLICATION_NOT_INSTALLED.preFmt("Core::saveOptions", {"~name": unique_name});

		var volume = "";
		if(dbApp.type == config.SPACELET)
			volume = config.SPACELETS_PATH + dbApp.unique_directory + config.VOLUME_DIRECTORY;
		else if(dbApp.type == config.SANDBOXED)
			volume = config.SANDBOXED_PATH + dbApp.unique_directory + config.VOLUME_DIRECTORY;
		//else if(dbApp.type == config.NATIVE)
		//	volume = config.NATIVEAPPS_PATH + dbApp.unique_directory + config.VOLUME_DIRECTORY;

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
	var data = null;
	var session = securityModel.findSession(sessionId);

	try {
		if(!session || session.ip != arguments[arguments.length-1].remoteAddress)		// Accept only from the same ip (= logged in device)
			throw language.E_INVALID_SESSION.pre("Core::loadOptions");

		var dbApp = database.sync.getApplication(unique_name) || null;					// Get application, path to volume and load
		if(!dbApp)
			throw language.E_APPLICATION_NOT_INSTALLED.preFmt("Core::loadOptions", {"~name": unique_name});

		var volume = "";
		if(dbApp.type == config.SPACELET)
			volume = config.SPACELETS_PATH + dbApp.unique_directory + config.VOLUME_DIRECTORY;
		else if(dbApp.type == config.SANDBOXED)
			volume = config.SANDBOXED_PATH + dbApp.unique_directory + config.VOLUME_DIRECTORY;
		//else if(dbApp.type == config.NATIVE)
		//	volume = config.NATIVE_PATH + dbApp.unique_directory + config.VOLUME_DIRECTORY;

		if(directory != "")
			directory += (directory.search(/\/$/) != -1 ? "" : "/");

		var data = fs.sync.readFile(volume + directory + file, {encoding: "utf8"});
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

	// PUBLIC NON-EXPOSED -- -- -- -- -- -- -- -- -- -- //
self.loginToSpaceifyNet = fibrous( function(mode)
	{
	try {
		var user = database.sync.getUserData();

		var result = utility.sync.postForm(config.EDGE_LOGIN_URL, {form: {un: user.edge_id, pw: user.edge_password, md: mode}});

		if(mode == "login")
			{
			isLoggedInToSpaceifyNet = true;

			if(result.body == "")
				logger.info(utility.replace(language.LOGGED_IN_SPACEIFY_NET, {"~edge_id": user.edge_id}));
			else
				logger.warn(utility.replace(language.LOGGING_IN_SPACEIFY_NET_FAILED, {"~result": result.body}));
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

		throw language.E_EDGE_LOGIN.pre("Core::loginToSpaceifyNet", err);
		}
	finally
		{
		database.close();
		}
	});

	// PRIVATE -- -- -- -- -- -- -- -- -- -- //
var get = function(method, search)
	{
	var result = spaceletManager[method](search);

	if(result == null)
		result = sandboxedManager[method](search);

	/*if(result == null)
		result = nativeManager[method](search);*/

	return result;
	}

var getManager = function(type)
	{
	var manager = null;

	if(type == "spacelet")
		manager = spaceletManager;
	else if(type == "sandboxed")
		manager = sandboxedManager;
	/*else if(type == "native")
		manager = nativeManager;*/

	return manager;
	}

}

module.exports = Core;
