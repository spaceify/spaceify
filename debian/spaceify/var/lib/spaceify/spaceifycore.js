#!/usr/bin/env node
/**
 * Spaceify core WebSocket server, 2.9.2013 Spaceify Inc.
 * 
 * @class SpaceifyCore
 */

var fs = require("fs");
var mkdirp = require("mkdirp");
var crypto = require("crypto");
var fibrous = require("fibrous");
var DHCPServer = require("./dhcpserver");
var logger = require("./logger");
var Config = require("./config")();
var Const = require("./constants");
var Utility = require("./utility");
var Iptables = require("./iptables");
var Language = require("./language");
var Database = require("./database");
var ConnectionHub = require("./connectionhub");
var SpaceletManager = require("./spaceletmanager");
var SandboxedApplicationManager = require("./sandboxedapplicationmanager");

function SpaceifyCore()
{
var self = this;

var sessions = {};
var isLoggedInToSpaceifyNet = false;

var sandboxedApplicationManager = new SandboxedApplicationManager();
var spaceletManager = new SpaceletManager();
var connectionHub = new ConnectionHub();
var dhcpserver = new DHCPServer();
var database = new Database();
var iptables = new Iptables();

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// CONNECTION  // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.connect = fibrous( function(options)
	{
	connectionHub.sync.connect(options, self);
	});

self.close = fibrous( function()
	{
	spaceletManager.sync.stopAll(true);

	sandboxedApplicationManager.sync.stopAll(true);

	connectionHub.sync.close();
	});

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// APPLICATIONS   // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.startApplications = fibrous(function()
	{
	try {
		sandboxedApplicationManager.sync.start();
		}
	catch(err)
		{}
	});

self.getServiceMappingsByUniqueName = function(unique_name, service_name)
	{ // Get spacelets, sandboxed applications or native applications service mappings identified by unique and service name. If service_name is defined return the requested service mapping. Return null if no service mappings or the requested service mapping is not found.
	// TRY TO FIND SERVICE MAPPINGS FROM SPACELETS, SANDBOXED APPLICATIONS OR NATIVE APPLICATIONS
	var services = spaceletManager.getByUniqueName(unique_name, "services");
	if(services == null)
		services = sandboxedApplicationManager.getByUniqueName(unique_name, "services");
	/*if(services == null)
		services = nativeApplicationManager.getByUniqueName(unique_name, "services");*/

	// IS THE REQUESTED SERVICE MAPPING AVAILABLE
	if(services != null && typeof service_name != "undefined")
		{
		for(s in services)
			{
			if(services[s].service_name == service_name)
				return services[s];
			}
		}

	return null;
	}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// MISC METHODS   // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.loginToSpaceifyNet = fibrous( function(mode)
	{
	try {
		database.open(Config.SPACEIFY_DATABASE_FILEPATH);
		var user = database.sync.getUserData();

		// ToDo: in final version use https!!!
		var result = Utility.sync.postForm("http://spaceify.net/edge_login.php", {form: {un: user.edge_id, pw: user.edge_password, md: mode}});

		if(mode == "login")
			{
			isLoggedInToSpaceifyNet = true;

			if(result.body == "")
				logger.info(Utility.replace(Language.LOGGED_IN_SPACEIFY_NET, {":edge_id": user.edge_id}));
			else
				logger.warn(Utility.replace(Language.LOGGING_IN_SPACEIFY_NET_FAILED, {":result": result.body}));
			}
		else
			{
			isLoggedInToSpaceifyNet = false;

			logger.info(Language.LOGGED_OUT_SPACEIFY_NET);
			}
		}
	catch(err)
		{
		isLoggedInToSpaceifyNet = false;

		throw Utility.error(false, Language.E_EDGE_LOGIN.p("SpaceifyCore::loginToSpaceifyNet()"), err);
		}
	finally
		{
		database.close();
		}
	});
	
// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// EXPOSED RPC METHODS  // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.startSpacelet = fibrous( function(unique_name)
	{
	try {
		var spacelet = spaceletManager.sync.start(unique_name);
		}
	catch(err)
		{
		throw err;
		}

	return spacelet.getServiceMappings();												// return value is the array of service name-port mappings of the spacelet!
	});

self.registerService = fibrous( function(service_name)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by spaceify core to the end of parameters

	// ALLOW REGISTRATION ONLY FROM STARTED SPACELETS, SANDBOXED APPLICATIONS AND NATIVE APPLICATIONS - APPLICATION MUST BE UP AND RUNNING BEFORE IT CAN REGISTER SERVICES
	var app = spaceletManager.findByRemoteAddress(connobj.remoteAddress);
	if(app == null)
		app = sandboxedApplicationManager.findByRemoteAddress(connobj.remoteAddress);
	/*if(app == null)
		app = nativeApplicationManager.findByRemoteAddress(connobj.remoteAddress);*/

	if(app == null)
		throw Utility.ferror(false, Language.E_REGISTER_SERVICE_UNKNOWN_ADDRESS.p("SpaceifyCore::registerService()"), {":address": connobj.remoteAddress});

	// ToDo: Other security considerations before accepting the registration?

	// APPLICATION CAN REGISTER ONLY ITS OWN SERVICES = SERVICE NAME FOUND IN THE SERVICES
	if(!app.registerService(service_name, true))
		throw Utility.ferror(false, Language.E_REGISTER_SERVICE_UNKNOWN_SERVICE_NAME.p("SpaceifyCore::registerService()"), {":name": service_name});

	return true;
	});

self.unregisterService = fibrous( function(service_name)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by spaceify core to the end of parameters

	// ALLOW UNREGISTRATION ONLY FROM STARTED SPACELETS, SANDBOXED APPLICATIONS AND NATIVE APPLICATIONS - APPLICATION MUST BE UP AND RUNNING BEFORE IT CAN REGISTER SERVICES
	var app = spaceletManager.findByRemoteAddress(connobj.remoteAddress);
	if(app == null)
		app = sandboxedApplicationManager.findByRemoteAddress(connobj.remoteAddress);
	/*if(app == null)
		app = nativeApplicationManager.findByRemoteAddress(connobj.remoteAddress);*/

	if(app == null)
		throw Utility.error(false, Language.E_UNREGISTER_SERVICE_UNKNOWN_ADDRESS.p("SpaceifyCore::unregisterService()"), {address: connobj.remoteAddress});

	// ToDo: Other security considerations before accepting the unregistration?

	// APPLICATION CAN UNREGISTER ONLY ITS OWN SERVICES = SERVICE NAME FOUND IN THE SERVICES
	if(!app.registerService(service_name, false))
		throw Utility.error(false, Language.E_UNREGISTER_SERVICE_UNKNOWN_SERVICE_NAME.p("SpaceifyCore::unregisterService()"), {name: service_name});

	return true;
	});

self.findService = fibrous( function(service_name)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by spaceify core to the end of parameters

	// TRY TO FIND THE SERVICE
	var service = spaceletManager.findService(service_name, connobj.remoteAddress);
	if(service == null)
		service = sandboxedApplicationManager.findService(service_name, connobj.remoteAddress);
	/*if(service == null)
		service = nativeApplicationManager.findService(service_name);*/

	if(service == null)
		throw Utility.ferror(false, Language.E_FIND_SERVICE_UNKNOWN.p("SpaceifyCore::findService()"), {":name": service_name});

	if(!service.registered)
		throw Utility.error(false, Language.E_FIND_SERVICE_UNREGISTERED.p("SpaceifyCore::findService()"));

	// ToDo:
	// SPACELET, SANDBOXED APPLICATION OR NATIVE APPLICATION CAN ASK SERVICES THAT ARE LISTED IN THEIR MANIFESTS REQUIRED SERVICES?
	// or anybody can ask any service?
	/*if(service_type == Const.OPEN_LOCAL)												// UNLESS SERVICE TYPE IS OPEN LOCAL
		{
		// ToDo: accept without any other checks
		}
	else if(service_type == Const.STANDARD)
		{
		if((client = findClientByRemoteAddress(connobj.remoteAddress)) == null)
			throw Utility.error(false, Language.E_FIND_SERVICE_UNKNOWN_ADDRESS.p("SpaceifyCore::findService()"));
		}*/

	return service;
	});

self.initialized = fibrous( function(status, reason)
	{ // status: true = application (spacelet, sandboxed aplication, native application) initialized itself succesfully, false = application failed to initialize itself
	var connobj = arguments[arguments.length - 1];										// Connection object is added by spaceify core to the end of parameters
	
	if((client = findClientByRemoteAddress(connobj.remoteAddress)) != null)
		client.manager.initialized(client.application, status);

	if(reason != null)																	// Log reason string
		logger.error(reason);

	return true;
	});

self.adminLogIn = fibrous( function(password)
	{
	var session_id = null;
	var connobj = arguments[arguments.length - 1];										// Connection object is added by spaceify core to the end of parameters

	try {
		checkSessionTTL.sync();

		if(connobj.remoteAddress == "")
			throw Utility.error(false, Language.E_ADMIN_LOGIN_ADDRESS.p("SpaceifyCore::adminLogIn()"));

		// GET CLIENTS MAC
		var lease = dhcpserver.getDHCPLeaseByIP(connobj.remoteAddress);
		if(!lease)
			throw Utility.error(false, Language.E_UNKNOWN_MAC.p("SpaceifyCore::adminLogIn()"));

		// CHECK THE PASSWORD - UPDATE DATABASE
		database.open(Config.SPACEIFY_DATABASE_FILEPATH);
		user = database.sync.getUserData();

		if(typeof user == "undefined")
			throw Utility.error(false, Language.E_ADMIN_LOGIN_USER.p("SpaceifyCore::adminLogIn()"));

		var shasum = crypto.createHash("sha512");
		shasum.update(password + user.admin_salt);
		var password_hash = shasum.digest("hex").toString();

		if(password_hash != user.admin_password_hash)
			throw Utility.error(false, Language.E_ADMIN_LOGIN_PASSWORD.p("SpaceifyCore::adminLogIn()"));

		var last_login = Date.now();
		database.sync.adminLoggedIn([last_login]);

		// START A NEW SESSION
		shasum = crypto.createHash("sha512");
		var result = Utility.execute.sync("openssl", ["rand", "-hex", "32"], {}, null);
		shasum.update(result.stdout);
		session_id = shasum.digest("hex").toString();

		sessions[lease["mac_or_duid"]] = {"session_id": session_id, "timestamp": last_login, "ip": connobj.remoteAddress};
		}
	catch(err)
		{
		throw Utility.error(false, Language.E_ADMIN_LOGIN_ERROR.p("SpaceifyCore::adminLogIn()"), err);
		}
	finally
		{
		database.close();
		}

	return session_id;
	});

self.adminLogOut = fibrous( function(session_id)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by spaceify core to the end of parameters

	try {
		checkSessionTTL.sync();

		if(connobj.remoteAddress == "")
			throw Utility.error(false, Language.E_ADMIN_LOGIN_ADDRESS.p("SpaceifyCore::adminLogOut()"));

		// GET CLIENTS MAC
		var lease = dhcpserver.getDHCPLeaseByIP(connobj.remoteAddress);
		if(!lease)
			throw Utility.error(false, Language.E_UNKNOWN_MAC.p("SpaceifyCore::adminLogOut()"));

		// UNSET SESSION - SESSION CAN BE UNSET ONLY BY THE SAME USER WHO SET IT (LOGGED IN USER)
		if(sessions[lease["mac_or_duid"]] && sessions[lease["mac_or_duid"]].session_id == session_id)
			delete sessions[lease["mac_or_duid"]];
		}
	catch(err)
		{
		throw Utility.error(false, Language.E_ADMIN_LOGOUT_ERROR.p("SpaceifyCore::adminLogOut()"), err);
		}

	return true;
	});

self.isAdminAuthenticated = fibrous( function(session_id)
	{
	var session = findSession(session_id);
	return (session ? true : false);
	});

self.applyOptions = fibrous( function(session_id, unique_name, directory, filename, data)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by spaceify core to the end of parameters
	return options.sync(session_id, unique_name, directory, filename, data, true, connobj);
	});
self.saveOptions = fibrous( function(session_id, unique_name, directory, filename, data)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by spaceify core to the end of parameters
	return options.sync(session_id, unique_name, directory, filename, data, false, connobj);
	});
var options = fibrous( function(session_id, unique_name, directory, filename, data, bRestart, connobj)
	{
	var session = findSession(session_id);
	var optionsOk = false;

	try {
		if(!session || session.ip != connobj.remoteAddress)								// Accept only from the same ip (= logged in device)
			throw Utility.error(false, Language.E_OPTIONS_SESSION_INVALID.p("SpaceifyCore::saveOptions()"));

		database.open(Config.SPACEIFY_DATABASE_FILEPATH);

		var app = database.sync.getApplication([unique_name], false) || null;			// Get application, path to volume, create directory and save
		if(!app)
			throw Utility.ferror(false, Language.E_OPTIONS_UNKNOWN_APPLICATION.p("SpaceifyCore::saveOptions()"), {":name": unique_name});

		var volume = "";
		if(app.type == Const.SPACELET)
			volume = Config.SPACELETS_PATH + app.unique_directory + Config.VOLUME_DIRECTORY;
		else if(app.type == Const.SANDBOXED_APPLICATION)
			volume = Config.SANDBOXEDAPPS_PATH + app.unique_directory + Config.VOLUME_DIRECTORY;
		/*else if(app.type == Const.NATIVE_APPLICATION)
			volume = Config.NATIVEAPPS_PATH + app.unique_directory + Config.VOLUME_DIRECTORY;*/

		if(directory != "")
			{
			directory += (directory.search(/\/$/) != -1 ? "" : "/");
			mkdirp.sync(volume + directory, parseInt("0755", 8));
			}

		fs.sync.writeFile(volume + directory + filename, JSON.stringify(data), {encoding: "utf8"});

		if(bRestart)
			{
			connobj.remoteAddress = Config.EDGE_IP;										// "fake" the ip so that the xApplication methods can be used
			self.sync.stopApplication(app.type, unique_name, connobj);
			self.sync.startApplication(app.type, unique_name, connobj);
			}

		optionsOk = true;
		}
	catch(err)
		{
		throw err;
		}
	finally
		{
		database.close();
		}

	return optionsOk;
	});

self.loadOptions = fibrous( function(session_id, unique_name, directory, filename)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by spaceify core to the end of parameters
	var session = findSession(session_id);
	var options = null;

	try {
		if(!session || session.ip != connobj.remoteAddress)								// Accept only from the same ip (= logged in device)
			throw Utility.error(false, Language.E_OPTIONS_SESSION_INVALID.p("SpaceifyCore::loadOptions()"));

		database.open(Config.SPACEIFY_DATABASE_FILEPATH);

		var app = database.sync.getApplication([unique_name], false) || null;			// Get application, path to volume and load
		if(!app)
			throw Utility.ferror(false, Language.E_OPTIONS_UNKNOWN_APPLICATION.p("SpaceifyCore::loadOptions()"), {":name": unique_name});

		var volume = "";
		if(app.type == Const.SPACELET)
			volume = Config.SPACELETS_PATH + app.unique_directory + Config.VOLUME_DIRECTORY;
		else if(app.type == Const.SANDBOXED_APPLICATION)
			volume = Config.SANDBOXEDAPPS_PATH + app.unique_directory + Config.VOLUME_DIRECTORY;
		/*else if(app.type == Const.NATIVE_APPLICATION)
			volume = Config.NATIVEAPPS_PATH + app.unique_directory + Config.VOLUME_DIRECTORY;*/

		if(directory != "")
			directory += (directory.search(/\/$/) != -1 ? "" : "/");

		var optionsFile = fs.sync.readFile(volume + directory + filename, {encoding: "utf8"});
		options = JSON.parse(optionsFile);
		}
	catch(err)
		{
		throw err;
		}
	finally
		{
		database.close();
		}

	return options;
	});

self.setSplashAccepted = fibrous( function()
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by spaceify core to the end of parameters

	try {
		var lease = dhcpserver.getDHCPLeaseByIP(connobj.remoteAddress);					// Lease must exist for the device
		if(!lease)
			throw Utility.error(false, Language.E_UNKNOWN_MAC.p("SpaceifyCore::setSplashAccepted()"));

		if(!iptables.sync.splashAddRule(lease.mac_or_duid))								// Add MAC to the iptables rules
			throw Utility.error(false, Language.E_SPLASH_ADD_FAILED.p("SpaceifyCore::setSplashAccepted()"));

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
console.log(err);
		return err;
		}

	return true;
	});

self.startApplication = fibrous(function(type, unique_name)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by spaceify core to the end of parameters

	if(connobj.remoteAddress != Config.EDGE_IP)											// Only local clients can call this method
		return false;

	if(type == Const.SPACELET)
		spaceletManager.sync.start(unique_name);
	else if(type == Const.SANDBOXED_APPLICATION)
		sandboxedApplicationManager.sync.start(unique_name);
	/*else if(type == NATIVE_APPLICATION) {}
		nativeApplicationManager.sync.start(unique_name);*/
	});

self.stopApplication = fibrous(function(type, unique_name)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by spaceify core to the end of parameters

	if(connobj.remoteAddress != Config.EDGE_IP)											// Only local clients can call this method
		return false;

	if(type == Const.SPACELET)
		spaceletManager.sync.stopByUniqueName(unique_name, true);
	else if(type == Const.SANDBOXED_APPLICATION)
		sandboxedApplicationManager.sync.stopByUniqueName(unique_name, true);
	/*else if(type == NATIVE_APPLICATION) {}
		nativeApplicationManager.sync.stopByUniqueName(unique_name, true);*/
	});

self.isApplicationRunning = fibrous(function(type, unique_name)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by spaceify core to the end of parameters

	if(connobj.remoteAddress != Config.EDGE_IP)											// Only local clients can call this method
		return false;

	var isRunning = false;
	if(type == Const.SPACELET)
		isRunning = spaceletManager.isRunning(unique_name);
	else if(type == Const.SANDBOXED_APPLICATION)
		isRunning = sandboxedApplicationManager.isRunning(unique_name);
	/*else if(type == NATIVE_APPLICATION) {}
		isRunning = nativeApplicationManager.isRunning(unique_name);*/

	return isRunning;
	});

self.getApplicationData = fibrous(function(unique_name)
	{
	var app_data = null;
	var manifest = null;
	var services = null;

	try {
		database.open(Config.SPACEIFY_DATABASE_FILEPATH);

		if(!unique_name)
			{
			var app_data = { spacelets: [], sandboxed: []/*, native: []*/ };

			var spacelets = database.sync.getApplication([Const.SPACELET], true) || [];
			for(var i=0; i<spacelets.length; i++)
				{
				manifest = Utility.sync.loadManifest(Config.SPACELETS_PATH + spacelets[i].unique_directory + Config.VOLUME_DIRECTORY + Config.APPLICATION_DIRECTORY + Const.MANIFEST, true, true);
				manifest.service_mappings = spaceletManager.getByUniqueName(manifest.unique_name, "services");
				manifest.is_running = spaceletManager.isRunning(manifest.unique_name);
				app_data.spacelets.push(manifest);
				}

			var sandboxed = database.sync.getApplication([Const.SANDBOXED_APPLICATION], true) || [];
			for(var i=0; i<sandboxed.length; i++)
				{
				manifest = Utility.sync.loadManifest(Config.SANDBOXEDAPPS_PATH + sandboxed[i].unique_directory + Config.VOLUME_DIRECTORY + Config.APPLICATION_DIRECTORY + Const.MANIFEST, true, true);
				manifest.service_mappings = sandboxedApplicationManager.getByUniqueName(manifest.unique_name, "services");
				manifest.is_running = sandboxedApplicationManager.isRunning(manifest.unique_name);
				app_data.sandboxed.push(manifest);
				}

			/*var native = database.sync.getApplication([Const.NATIVE_APPLICATION], true) || [];
			for(var i=0; i<native.length; i++)
				{
				manifest = Utility.sync.loadManifest(Config.NATIVEAPPS_PATH + native[i].unique_directory + Config.VOLUME_DIRECTORY + Config.APPLICATION_DIRECTORY + Const.MANIFEST, true, true);
				manifest.service_mappings = nativeApplicationManager.getByUniqueName(manifest.unique_name, "services");
				manifest.is_running = nativeApplicationManager.isRunning(manifest.unique_name);
				app_data.native.push(Utility.parseManifest(manifest));
				}*/
			}
		else
			app_data = database.sync.getApplication([unique_name]);
		}
	catch(err)
		{
		throw err;
		}
	finally
		{
		database.close();
		}

	return app_data;
	});

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// PRIVATE  // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
var findClientByRemoteAddress = function(remoteAddress)
	{
	var man = null, app = null;

	app = spaceletManager.findByRemoteAddress(remoteAddress);
	man = spaceletManager;

	if(app == null)
		{
		app = sandboxedApplicationManager.findByRemoteAddress(remoteAddress);
		man = sandboxedApplicationManager;
		}

	/*if(app == null)
		{
		app = nativeApplicationManager.findByRemoteAddress(remoteAddress);
		man = nativeApplicationManager;
		}*/

	return (app != null ? {"application": app, "manager": man} : null);
	}

var checkSessionTTL = fibrous( function()
	{ // Remove expired sessions (garbage collection)
	var now = Date.now();
	var session_ttl = database.sync.getSetting("session_ttl", 86400000, false);

	for(i in sessions)
		{
		if((now - sessions[i].timestamp) > session_ttl)
			delete sessions[i];
		}
	});

var findSession = function(session_id)
	{
	checkSessionTTL.sync();

	for(i in sessions)
		{
		if(sessions[i].session_id == session_id)
			return sessions[i];
		}

	return null;
	}

}

module.exports = SpaceifyCore;
