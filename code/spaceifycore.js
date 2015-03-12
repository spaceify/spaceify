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
var SandboxedManager = require("./sandboxedmanager");

function SpaceifyCore()
{
var self = this;

var sessions = {};
var isLoggedInToSpaceifyNet = false;

var sandboxedManager = new SandboxedManager();
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
	spaceletManager.sync.removeAll(true);

	sandboxedManager.sync.removeAll(true);

	connectionHub.sync.close();
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
		throw Utility.error(Language.E_FAILED_TO_START_SPACELET.p("SpaceifyCore::startSpacelet()"), err);
		}

	return spacelet.getServices();														// return value is the array of service names-ports of the spacelet!
	});

self.registerService = fibrous( function(service_name)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument

	// ALLOW REGISTRATION ONLY FROM STARTED SPACELETS, SANDBOXED APPLICATIONS AND NATIVE APPLICATIONS - APPLICATION MUST BE UP AND RUNNING BEFORE IT CAN REGISTER SERVICES
	var _find = self.find("remote_address", connobj.remoteAddress);

	if(_find.obj == null)
		throw Utility.ferror(Language.E_REGISTER_SERVICE_UNKNOWN_ADDRESS.p("SpaceifyCore::registerService()"), {":address": connobj.remoteAddress});

	// ToDo: Other security considerations before accepting the registration?

	// APPLICATION CAN REGISTER ONLY ITS OWN SERVICES = SERVICE NAME FOUND IN THE SERVICES
	var service = _find.obj.registerService(service_name, true);
	if(!service)
		throw Utility.ferror(Language.E_REGISTER_SERVICE_UNKNOWN_SERVICE_NAME.p("SpaceifyCore::registerService()"), {":name": service_name});

	return service;
	});

self.unregisterService = fibrous( function(service_name)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument

	// ALLOW UNREGISTRATION ONLY FROM STARTED SPACELETS, SANDBOXED APPLICATIONS AND NATIVE APPLICATIONS - APPLICATION MUST BE UP AND RUNNING BEFORE IT CAN REGISTER SERVICES
	var _find = self.find("remote_address", connobj.remoteAddress);

	if(_find.obj == null)
		throw Utility.error(Language.E_UNREGISTER_SERVICE_UNKNOWN_ADDRESS.p("SpaceifyCore::unregisterService()"), {address: connobj.remoteAddress});

	// ToDo: Other security considerations before accepting the unregistration?

	// APPLICATION CAN UNREGISTER ONLY ITS OWN SERVICES = SERVICE NAME FOUND IN THE SERVICES
	var service = _find.obj.registerService(service_name, true);
	if(!service)
		throw Utility.error(Language.E_UNREGISTER_SERVICE_UNKNOWN_SERVICE_NAME.p("SpaceifyCore::unregisterService()"), {name: service_name});

	return service;
	});

self.getServices = fibrous( function(services)
	{ // Get either by service name or service name and unique_name.
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument
	var _services = [];

	for(var i=0; i<services.length; i++)
		{
		try {
			var _find = self.getService(services[i].service_name, services[i].unique_name);
			_services.push({err: null, data: _find});
			}
		catch(err)
			{
			_services.push({err: err, data: null});
			}
		}

	return (_services.length > 0 ? _services : null);
	});

self.getService = fibrous( function(service_name, unique_name)
	{ // Get either by service name or service name and unique_name.
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument

	// TRY TO FIND THE SERVICE
	var _find = self.find("service", {service_name: service_name, unique_name: unique_name});

	if(_find.obj == null)
		throw Utility.ferror(Language.E_FIND_SERVICE_UNKNOWN.p("SpaceifyCore::findService()"), {":name": service_name});

	if(!_find.obj.registered)
		throw Utility.error(Language.E_FIND_SERVICE_UNREGISTERED.p("SpaceifyCore::findService()"));

	// ToDo:
	// SPACELET, SANDBOXED APPLICATION OR NATIVE APPLICATION CAN ASK SERVICES THAT ARE LISTED IN THEIR MANIFESTS REQUIRED SERVICES?
	// or anybody can ask any service?
	/*if(_find.obj.service_type == Const.OPEN_LOCAL) // UNLESS SERVICE TYPE IS OPEN_LOCAL
		{
		if((client = self.find("remote_address", connobj.remoteAddress)) == null)
		throw Utility.error(Language.E_FIND_SERVICE_UNKNOWN_ADDRESS.p("SpaceifyCore::findService()"));
		// ip not from local source
		}
	else if(_find.obj.service_type == Const.STANDARD)
		{
		// ToDo: accept without any other checks
		}*/

	return _find.obj;
	});

self.initialized = fibrous( function(status, reason)
	{ // status: true = application (spacelet, sandboxed aplication, native application) initialized itself succesfully, false = application failed to initialize itself
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument

	if((_find = self.find("remote_address", connobj.remoteAddress)) != null)
		_find.manager.initialized(_find.obj, status);

	if(reason != null)																	// Output reason string
		logger.error(reason);

	return true;
	});

self.adminLogIn = fibrous( function(password)
	{
	var session_id = null;
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument

	try {
		checkSessionTTL.sync();

		if(connobj.remoteAddress == "")
			throw Utility.error(Language.E_ADMIN_LOGIN_ADDRESS.p("SpaceifyCore::adminLogIn()"));

		// GET CLIENTS MAC
		var lease = dhcpserver.getDHCPLeaseByIP(connobj.remoteAddress);
		if(!lease)
			throw Utility.error(Language.E_UNKNOWN_MAC.p("SpaceifyCore::adminLogIn()"));

		// CHECK THE PASSWORD - UPDATE DATABASE
		database.open(Config.SPACEIFY_DATABASE_FILE);
		user = database.sync.getUserData();

		if(typeof user == "undefined")
			throw Utility.error(Language.E_ADMIN_LOGIN_USER.p("SpaceifyCore::adminLogIn()"));

		var shasum = crypto.createHash("sha512");
		shasum.update(password + user.admin_salt);
		var password_hash = shasum.digest("hex").toString();

		if(password_hash != user.admin_password_hash)
			throw Utility.error(Language.E_ADMIN_LOGIN_PASSWORD.p("SpaceifyCore::adminLogIn()"));

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
		throw Utility.error(err);
		}
	finally
		{
		database.close();
		}

	return session_id;
	});

self.adminLogOut = fibrous( function(session_id)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument

	try {
		checkSessionTTL.sync();

		if(connobj.remoteAddress == "")
			throw Utility.error(Language.E_ADMIN_LOGIN_ADDRESS.p("SpaceifyCore::adminLogOut()"));

		// GET CLIENTS MAC
		var lease = dhcpserver.getDHCPLeaseByIP(connobj.remoteAddress);
		if(!lease)
			throw Utility.error(Language.E_UNKNOWN_MAC.p("SpaceifyCore::adminLogOut()"));

		// UNSET SESSION - SESSION CAN BE UNSET ONLY BY THE SAME USER WHO SET IT (LOGGED IN USER)
		if(sessions[lease["mac_or_duid"]] && sessions[lease["mac_or_duid"]].session_id == session_id)
			delete sessions[lease["mac_or_duid"]];
		}
	catch(err)
		{
		throw Utility.error(err);
		}

	return true;
	});

self.isAdminLoggedIn = fibrous( function(session_id)
	{
	var session = findSession(session_id);
	return (session ? true : false);
	});

self.saveOptions = fibrous( function(session_id, unique_name, directory, file, data)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument
	var session = findSession(session_id);
	var optionsOk = false;

	try {
		if(!session || session.ip != connobj.remoteAddress)								// Accept only from the same ip (= logged in device)
			throw Utility.error(Language.E_OPTIONS_SESSION_INVALID.p("SpaceifyCore::saveOptions()"));

		database.open(Config.SPACEIFY_DATABASE_FILE);

		var app = database.sync.getApplication([unique_name], false) || null;			// Get application, path to volume, create directory and save
		if(!app)
			throw Utility.ferror(Language.E_OPTIONS_UNKNOWN_APPLICATION.p("SpaceifyCore::saveOptions()"), {":name": unique_name});

		var volume = "";
		if(app.type == Const.SPACELET)
			volume = Config.SPACELETS_PATH + app.unique_directory + Config.VOLUME_DIRECTORY;
		else if(app.type == Const.SANDBOXED_APPLICATION)
			volume = Config.SANDBOXED_PATH + app.unique_directory + Config.VOLUME_DIRECTORY;
		/*else if(app.type == Const.NATIVE_APPLICATION)
			volume = Config.NATIVEAPPS_PATH + app.unique_directory + Config.VOLUME_DIRECTORY;*/

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
		throw Utility.error(err);
		}
	finally
		{
		database.close();
		}

	return optionsOk;
	});

self.loadOptions = fibrous( function(session_id, unique_name, directory, file)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument
	var session = findSession(session_id);
	var data = null;

	try {
		if(!session || session.ip != connobj.remoteAddress)								// Accept only from the same ip (= logged in device)
			throw Utility.error(Language.E_OPTIONS_SESSION_INVALID.p("SpaceifyCore::loadOptions()"));

		database.open(Config.SPACEIFY_DATABASE_FILE);

		var app = database.sync.getApplication([unique_name], false) || null;			// Get application, path to volume and load
		if(!app)
			throw Utility.ferror(Language.E_OPTIONS_UNKNOWN_APPLICATION.p("SpaceifyCore::loadOptions()"), {":name": unique_name});

		var volume = "";
		if(app.type == Const.SPACELET)
			volume = Config.SPACELETS_PATH + app.unique_directory + Config.VOLUME_DIRECTORY;
		else if(app.type == Const.SANDBOXED_APPLICATION)
			volume = Config.SANDBOXED_PATH + app.unique_directory + Config.VOLUME_DIRECTORY;
		/*else if(app.type == Const.NATIVE_APPLICATION)
			volume = Config.NATIVE_PATH + app.unique_directory + Config.VOLUME_DIRECTORY;*/

		if(directory != "")
			directory += (directory.search(/\/$/) != -1 ? "" : "/");

		var data = fs.sync.readFile(volume + directory + file, {encoding: "utf8"});
		}
	catch(err)
		{
		throw Utility.error(err);
		}
	finally
		{
		database.close();
		}

	return data;
	});

self.setSplashAccepted = fibrous( function()
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument

	try {
		var lease = dhcpserver.getDHCPLeaseByIP(connobj.remoteAddress);					// Lease must exist for the device
		if(!lease)
			throw Utility.error(Language.E_UNKNOWN_MAC.p("SpaceifyCore::setSplashAccepted()"));

		if(!iptables.sync.splashAddRule(lease.mac_or_duid))								// Add MAC to the iptables rules
			throw Utility.error(Language.E_SPLASH_ADD_FAILED.p("SpaceifyCore::setSplashAccepted()"));

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
		throw Utility.error(err);
		}

	return true;
	});

self.startApplication = fibrous(function(type, unique_name)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument

	if(connobj.remoteAddress != Config.EDGE_IP)											// Only local calls allowed for this method
		return false;

	if(type == Const.SPACELET)
		spaceletManager.sync.start(unique_name);
	else if(type == Const.SANDBOXED_APPLICATION)
		sandboxedManager.sync.start(unique_name);
	/*else if(type == NATIVE_APPLICATION) {}
		nativeManager.sync.start(unique_name);*/
	});

self.stopApplication = fibrous(function(type, unique_name)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument

	if(connobj.remoteAddress != Config.EDGE_IP)											// Only local calls allowed for this method
		return false;

	if(type == Const.SPACELET)
		spaceletManager.sync.stop(unique_name);
	else if(type == Const.SANDBOXED_APPLICATION)
		sandboxedManager.sync.stop(unique_name);
	/*else if(type == NATIVE_APPLICATION) {}
		nativeManager.sync.stop(unique_name, true);*/
	});

self.removeApplication = fibrous(function(type, unique_name)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument

	if(connobj.remoteAddress != Config.EDGE_IP)											// Only local calls allowed for this method
		return false;

	if(type == Const.SPACELET)
		spaceletManager.sync.remove(unique_name);
	else if(type == Const.SANDBOXED_APPLICATION)
		sandboxedManager.sync.remove(unique_name);
	/*else if(type == NATIVE_APPLICATION) {}
		nativeManager.sync.remove(unique_name, true);*/
	});

self.isApplicationRunning = fibrous(function(type, unique_name)
	{
	var connobj = arguments[arguments.length - 1];										// Connection object is added by Spaceify core as the last argument

	var isRunning = false;
	if(type == Const.SPACELET)
		isRunning = spaceletManager.isRunning(unique_name);
	else if(type == Const.SANDBOXED_APPLICATION)
		isRunning = sandboxedManager.isRunning(unique_name);
	/*else if(type == NATIVE_APPLICATION) {}
		isRunning = nativeManager.isRunning(unique_name);*/

	return isRunning;
	});

self.getApplicationData = fibrous(function(unique_name)
	{
	var app_dir = "";
	var app_data = null;
	var manifest = null;
	var services = null;

	try {
		database.open(Config.SPACEIFY_DATABASE_FILE);

		if(!unique_name)
			{
			var app_data = { spacelets: [], sandboxed: []/*, native: []*/ };

			var spacelets = database.sync.getApplication([Const.SPACELET], true) || [];
			for(var i=0; i<spacelets.length; i++)
				{
				app_dir = Config.SPACELETS_PATH + spacelets[i].unique_directory + Config.VOLUME_DIRECTORY + Config.APPLICATION_DIRECTORY;

				manifest = Utility.sync.loadManifest(app_dir + Const.MANIFEST, true, true);
				manifest.services = spaceletManager.find("services", manifest.unique_name);
				manifest.has_tile = Utility.sync.isLocal(app_dir + Config.WWW_DIRECTORY + Const.TILEFILE, "file");
				//manifest.has_options = Utility.sync.isLocal(app_dir + Config.WWW_DIRECTORY + Const.OPTIONSFILE, "file");
				app_data.spacelets.push(manifest);
				}

			var sandboxed = database.sync.getApplication([Const.SANDBOXED_APPLICATION], true) || [];
			for(var i=0; i<sandboxed.length; i++)
				{
				app_dir = Config.SANDBOXED_PATH + sandboxed[i].unique_directory + Config.VOLUME_DIRECTORY + Config.APPLICATION_DIRECTORY;

				manifest = Utility.sync.loadManifest(app_dir + Const.MANIFEST, true, true);
				manifest.services = sandboxedManager.find("services", manifest.unique_name);
				manifest.has_tile = Utility.sync.isLocal(app_dir + Config.WWW_DIRECTORY + Const.TILEFILE, "file");
				//manifest.has_options = Utility.sync.isLocal(app_dir + Config.WWW_DIRECTORY + Const.OPTIONSFILE, "file");
				app_data.sandboxed.push(manifest);
				}

			/*var native = database.sync.getApplication([Const.NATIVE_APPLICATION], true) || [];
			for(var i=0; i<native.length; i++)
				{
				app_dir = Config.NATIVE_PATH + native[i].unique_directory + Config.VOLUME_DIRECTORY + Config.APPLICATION_DIRECTORY;
					
				manifest = Utility.sync.loadManifest(app_dir + Const.MANIFEST, true, true);
				manifest.services = nativeManager.find("services", manifest.unique_name);
				manifest.has_tile = Utility.sync.isLocal(app_dir + Config.WWW_DIRECTORY + Const.TILEFILE, "file");
				//manifest.has_options = Utility.sync.isLocal(app_dir + Config.WWW_DIRECTORY + Const.OPTIONSFILE, "file");
				app_data.native.push(Utility.parseManifest(manifest));
				}*/
			}
		else
			app_data = database.sync.getApplication([unique_name]);
		}
	catch(err)
		{
		throw Utility.error(Language.E_GET_APP_DATA_FAILED.p("SpaceifyCore::getApplicationData()"), err);
		}
	finally
		{
		database.close();
		}

	return app_data;
	});

self.getManifest = fibrous( function(unique_name)
	{
	var service = null;

	// TRY TO GET THE MANIFEST
	var _find = self.find("manifest", unique_name);

	if(_find.obj == null)
		throw Utility.ferror(Language.E_GET_MANIFEST_NOT_FOUND.p("SpaceifyCore::getManifest()"), {":name": unique_name});

	return _find.obj;
	});

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// PUBLIC NON-EXPOSED   // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.initializeApplications = fibrous(function()
	{
	try {
		sandboxedManager.sync.start();

		spaceletManager.sync.build();
		}
	catch(err)
		{}
	});

self.loginToSpaceifyNet = fibrous( function(mode)
	{
	try {
		database.open(Config.SPACEIFY_DATABASE_FILE);
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

		throw Utility.error(Language.E_EDGE_LOGIN.p("SpaceifyCore::loginToSpaceifyNet()"), err);
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
