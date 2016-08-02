/**
 * Service model, 20.7.2015 Spaceify Oy
 * 
 * @class SecurityModel
 */

var fs = require("fs");
var url = require("url");
var crypto = require("crypto");
var fibrous = require("fibrous");
var rangeCheck = require("range_check");
var language = require("./language");
var Database = require("./database");
var SpaceifyError = require("./spaceifyerror");
var SpaceifyConfig = require("./spaceifyconfig");
var SpaceifyUtility = require("./spaceifyutility");
var WebSocketRpcConnection = require("./websocketrpcconnection");

function SecurityModel()
{
var self = this;

var errorc = new SpaceifyError();
var config = new SpaceifyConfig();
var utility = new SpaceifyUtility();

var sessions = {};
var settings = null;
var caCrt = config.SPACEIFY_WWW_PATH + config.SPACEIFY_CRT;

	// NETWORK -- -- -- -- -- -- -- -- -- -- //
self.isLocalIP = function(ip)
	{
	/*if(!ip.match(new RegExp(config.IP_REGX)))
		return false;

	var parts = ip.split(".");
	if(parts[0] == "127" || ip == config.EDGE_IP)
		return true;*/

	if(ip == "127.0.0.1" || ip == "::ffff:127.0.0.1" || ip == "::ffff:7f00:1")
		return true;

	return false;
	}

self.isApplicationIP = function(ip)
	{
	return rangeCheck.inRange(ip, config.APPLICATION_SUBNET);
	}

self.getEdgeURL = function()
	{
	return config.EDGE_HOSTNAME;
	}

self.getApplicationURL = function(isSecure)
	{
	return (isSecure ? "http://" : "https://") + config.EDGE_HOSTNAME + ":" + (isSecure ? "80" : "443");
	}

	// AUTHENTICATION -- -- -- -- -- -- -- -- -- -- //
self.adminLogIn = fibrous( function(password, remoteAddress)
	{
	checkSessionTTL();

	var sessionId = null;
	var database = new Database();

	try {
		self.sync.checkCallerRights(remoteAddress, null);

		// CHECK THE PASSWORD - UPDATE DATABASE
		var user = database.sync.getUserData();

		if(typeof user == "undefined")
			throw language.E_ADMIN_LOGIN_USER.pre("SecurityModel::adminLogIn");

		var shasum = crypto.createHash("sha512");
		shasum.update(password + user.admin_salt);
		var password_hash = shasum.digest("hex").toString();

		if(password_hash != user.admin_password_hash)
			throw language.E_ADMIN_LOGIN_PASSWORD.pre("SecurityModel::adminLogIn");

		var timestamp = Date.now();

		database.sync.adminLoggedIn([timestamp]);

		// START A NEW SESSION
		shasum = crypto.createHash("sha512");
		var result = utility.bytesToHexString(crypto.randomBytes(32));
		shasum.update(result);
		sessionId = shasum.digest("hex").toString();

		sessions[sessionId] = {timestamp: timestamp, remoteAddress: remoteAddress};
		}
	catch(err)
		{
		throw errorc.make(err);
		}
	finally
		{
		database.close();
		}

	return sessionId;
	});

self.adminLogOut = fibrous( function(sessionId, remoteAddress)
	{
	self.sync.checkCallerRights(remoteAddress, null);

	if(sessionId in sessions)
		delete sessions[sessionId];

	checkSessionTTL();
	});

self.findSession = fibrous( function(sessionId)
	{
	// Check temporary session
	if(utility.sync.isLocal(config.SPACEIFY_TEMP_SESSIONID, "file"))
		{
		var session = fs.sync.readFile(config.SPACEIFY_TEMP_SESSIONID, "utf8");

		session = utility.parseJSON(session, true);

		if(session.sessionId == sessionId)
			return session;
		}

	// Check log in sessions
	checkSessionTTL();

	if(sessionId in sessions)
		return sessions[sessionId];

	return null;
	});

self.createTemporarySession = fibrous( function(remoteAddress)
	{
	var session	=	{
					remoteAddress: remoteAddress,
					timestamp: Date.now(),
					sessionId: utility.randomString(64, true),
					};

	fs.sync.writeFile(config.SPACEIFY_TEMP_SESSIONID, JSON.stringify(session), "utf8");

	return session.sessionId;
	});

self.destroyTemporarySession = fibrous( function()
	{
	if(utility.sync.isLocal(config.SPACEIFY_TEMP_SESSIONID, "file"))
		fs.sync.unlink(config.SPACEIFY_TEMP_SESSIONID);
	});

self.checkCallerRights = fibrous( function(remoteAddress, sessionId)
	{
	if(!self.isLocalIP(remoteAddress))
		throw language.E_NON_EDGE_CALLER.pre("SecurityModel::checkCallerRights");

	if(sessionId && !self.sync.findSession(sessionId))
		throw language.E_ADMIN_NOT_LOGGED_IN.pre("SecurityModel::checkCallerRights");
	});

var checkSessionTTL = function()
	{ // Remove expired sessions (= garbage collection)
	var now = Date.now();

	for(var i in sessions)
		{
		if((now - sessions[i].timestamp) > settings.log_in_session_ttl)
			delete sessions[i];
		}
	}

self.refreshLogInSession = function(sessionId)
	{
	if(sessionId in sessions)
		sessions[sessionId].timestamp = Date.now();
	}

	// SAME ORIGIN POLICY -- -- -- -- -- -- -- -- -- -- //
self.sameOriginPolicyStartSpacelet = function(manifest, URL)
	{
	var matches = 0;
	var origins = manifest.origins;
	var hostname = url.parse(URL).hostname;
//console.log("++++++++++++++++++++++++++", manifest.unique_name, origins, URL);
return true;
	for(var i = 0; i < origins.length; i++)
		{
		if(matchOrigin(origins[i], hostname))
			matches++;
		}

	return (matches > 0 ? true : false);
	}

var matchOrigin = function(origin, hostname)
	{
	// Get origin components, e.g. *.example.* -> [ '*', '.example.', '*', '' ]
	var matched = origin.match(/\*|[^\*]*/g);

	// Make a capture grouped regular expression of the components, e.g. *.example.* -> (.*)(\.example\.)(.*)
	var cgs = "";
	for(var i = 0; i < matched.length; i++)
		{
		if(matched[i] == "*")
			cgs	+= "(.*)";
		else if(matched[i] != "")
			cgs	+= "(" + matched[i].replace(/\./g, "\\.") + ")";
		}

	// Match the hostname - the match must be complete (...)
	var rex = new RegExp("(" + cgs + ")");
	var matched = rex.exec(hostname);

	return (matched && matched[0] == hostname ? true : false);
	}

	// REGISTER, UNREGISTER, GET SERVICES -- -- -- -- -- -- -- -- -- -- //
self.registerService = function(application, service_name)
	{
	return application.registerService(service_name, true);
	}

self.unregisterService = function(application, service_name)
	{
	return application.registerService(service_name, false);
	}

self.getOpenServices = function(services, remoteAddress)
	{
	var result = [];

	if(services)
		{
		for(var i = 0; i < services.length; i++)
			{ // Web pages get only OPEN services, applications and spacelets get also OPEN_LOCAL services
			if(services[i].service_type == config.OPEN)
				result.push(self.makePublicService(services[i]));
			else if(self.isApplicationIP(remoteAddress) && services[i].service_type == config.OPEN_LOCAL)
				result.push(self.makePublicService(services[i]));
			}
		}

	return result;
	}

self.getService = function(service, application, remoteAddress)
	{
	var serviceReturn = null;

	if(!service.isRegistered)
		throw language.E_GET_SERVICE_UNREGISTERED.preFmt("SecurityModel::getService", {"~name": service.service_name});

	if(service.service_type == config.OPEN || service.service_type == config.HTTP)					// Service is open for all
		serviceReturn = self.makePublicService(service);
	else if(self.isApplicationIP(remoteAddress))													// Caller is an application or a spacelet
		{
		if(!application)
			throw language.E_GET_SERVICE_APPLICATION_NOT_FOUND.pre("SecurityModel::getService");

		if(service.service_type == config.OPEN_LOCAL)												// Service is open for all application and spacelets
			serviceReturn = self.makePublicService(service);
		else																						// Open only if service is listed in the required list
			{
			var requiresServices = application.getRequiresServices();
			if(!requiresServices)
				throw language.E_GET_SERVICE_APPLICATION_REQUIRES_SERVICES_NOT_DEFINED.preFmt("SecurityModel::getService", {"unique_name": application.getUniqueName()});

			for(var i = 0; i < requiresServices.length; i++)
				{
				if(requiresServices[i].service_name == service.service_name)
					{ serviceReturn = self.makePublicService(service); break; }
				}

			if(!serviceReturn)
				throw language.E_GET_SERVICE_FORBIDDEN.preFmt("SecurityModel::getService", {"~name": service.service_name});
			}
		}

	// ToDo: create iptable rule to allow or block traffic.

	return serviceReturn;
	}

self.makePublicService = function(service)
	{ // Only some of the service fields are passed to external callers (web page, applications, spacelets)
	var publicService = {};

	publicService.service_name = service.service_name;
	publicService.service_type = service.service_type;
	publicService.port = service.port;
	publicService.securePort = service.securePort;
	publicService.ip = service.ip;
	publicService.unique_name = service.unique_name;
	publicService.type = service.type;

	return publicService;
	}

	// ADMIN SESSION MANAGEMENT HELPERS -- -- -- -- -- -- -- -- -- -- //
self.isAdminLoggedIn = fibrous( function(sessionId, throws)
	{
	var coreRPC = null;
	var isLoggedIn = false;

	try {
		coreRPC = new WebSocketRpcConnection();
		coreRPC.sync.connect({hostname: config.ALL_IPV4_LOCAL, port: config.CORE_PORT_SECURE, isSecure: true, caCrt: caCrt});

		isLoggedIn = coreRPC.sync.callRpc("isAdminLoggedIn", [sessionId], self);

		if(!isLoggedIn && throws)
			throw language.E_ADMIN_NOT_LOGGED_IN.pre("SecurityModel::isAdminLoggedIn");
		}
	catch(err)
		{
		throw err;
		}
	finally
		{
		if(coreRPC)
			coreRPC.close();
		}

	return isLoggedIn;
	});

	// SETTINGS -- -- -- -- -- -- -- -- -- -- //
self.setSettings = function(settings_)
	{
	settings = settings_;
	}

}

module.exports = SecurityModel;
