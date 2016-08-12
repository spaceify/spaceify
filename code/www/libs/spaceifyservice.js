"use strict";

/**
 * Spaceify Service, 29.7.2015 Spaceify Oy
 *
 * A class for connecting required services and opening servers for provided services.
 * This class can be used by Node.js applications and web pages.
 *
 * @class SpaceifyService
 */

function SpaceifyService()
{
// NODE.JS / REAL SPACEIFY - - - - - - - - - - - - - - - - - - - -
var isNodeJs = (typeof exports !== "undefined" ? true : false);
var isRealSpaceify = (typeof process !== "undefined" ? process.env.IS_REAL_SPACEIFY : false);
var apiPath = (isNodeJs && isRealSpaceify ? "/api/" : "/var/lib/spaceify/code/");

var classes = 	{
				Service: (isNodeJs ? require(apiPath + "service") : Service),
				SpaceifyCore: (isNodeJs ? require(apiPath + "spaceifycore") : SpaceifyCore),
				SpaceifyConfig: (isNodeJs ? require(apiPath + "spaceifyconfig") : SpaceifyConfig),
				SpaceifyNetwork: (isNodeJs ? require(apiPath + "spaceifynetwork") : SpaceifyNetwork),
				WebSocketRpcServer: (isNodeJs ? require(apiPath + "websocketrpcserver") : null),
				WebSocketRpcConnection: (isNodeJs ? require(apiPath + "websocketrpcconnection") : WebSocketRpcConnection)
				};

var fibrous = (isNodeJs ? require("fibrous") : function(fn) { return fn; });
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

var self = this;

var core = new classes.SpaceifyCore();
var config = new classes.SpaceifyConfig();
var network = new classes.SpaceifyNetwork();

var required = {};									// <= Clients (required services)
var requiredSecure = {};

var provided = {};									// <= Servers (provided services)
var providedSecure = {};

var keepServerUp = true;
var keepConnectionUp = true;
var keepConnectionUpTimerIds = {};

var caCrt = apiPath + config.SPACEIFY_CRT_WWW;
var key = config.APPLICATION_TLS_PATH + config.SERVER_KEY;
var crt = config.APPLICATION_TLS_PATH + config.SERVER_CRT;

	// CLIENT SIDE - THE REQUIRED SERVICES - NODE.JS / WEB PAGES -- -- -- -- -- -- -- -- -- -- //
self.connect = function(service_name, callback)
	{
	if(service_name == config.HTTP)
		return callback(null, true);

	// Create the service objects and set their listener only once. Creating service objects even if making
	// connection to the them fails helps to avoid problems. For example clients can call the getRequiredService
	// method and a null reference is never returned. Clients can always call the getIsOpen method of the service
	// object to find out is the service connected.
	if(!required[service_name])
		{
		required[service_name] = new classes.Service(service_name, false, new classes.WebSocketRpcConnection());
		required[service_name].setConnectionListener(connectionListener);
		required[service_name].setDisconnectionListener(disconnectionListener);
		}

	if(!requiredSecure[service_name])
		{
		requiredSecure[service_name] = new classes.Service(service_name, false, new classes.WebSocketRpcConnection());
		requiredSecure[service_name].setConnectionListener(connectionListener);
		requiredSecure[service_name].setDisconnectionListener(disconnectionListener);
		}

	core.getService(service_name, "", function(err, service)
		{
		if(!service || err)																// Failed to get the required service
			{
			if(!required[service_name].getIsOpen())										// Let the automaton try to get the connections up
				disconnectionListener(-1, service_name, false);

			if(!requiredSecure[service_name].getIsOpen())
				disconnectionListener(-1, service_name, true);

			return callback(null, true);
			}

		connect(required[service.service_name], service.port, false, function()			// Try to open connections to the services
			{
			var hasSecure = (isNodeJs ? true : network.isSecure());

			if(hasSecure)																// Unencrypted web pages can't open secure connections
				{
				connect(requiredSecure[service.service_name], service.securePort, true, function()
					{
					callback(null, {insecure: required[service_name], secure: requiredSecure[service_name]});
					});
				}
			else
				callback(null, {insecure: required[service_name], secure: requiredSecure[service_name]});
			});
		});
	}

var connect = function(service, port, isSecure, callback)
	{
	if(service.getIsOpen())																// Don't reopen connections!
		return callback();

	service.getConnection().connect({ hostname: config.EDGE_HOSTNAME, port: port, isSecure: isSecure, caCrt: caCrt, debug: true }, callback);
	}

self.disconnect = function(service_names, callback)
	{ // Disconnect one service, listed services or all services
	var keys;

	if(!service_names)																	// All the services
		keys = Object.keys(required);
	else if(service_name.constructor !== Array)											// One service (string)
		keys = [service_names];

	for(var i = 0; i<keys.length; i++)
		{
		if(keys[i] in required)
			required[keys[i]].getConnection().close();

		if(keys[i] in requiredSecure)
			requiredSecure[keys[i]].getConnection().close();
		}
	}

var connectionListener = function(id, service_name, isSecure)
	{
	}

var disconnectionListener = function(id, service_name, isSecure)
	{
	if(!keepConnectionUp)
		return;

	var timerIdName = service_name + (!isSecure ? "F" : "T");							// Services have their own timers and
	if(timerIdName in keepConnectionUpTimerIds)											// only one timer can be running at a time
		return;

	var service = (!isSecure ? required[service_name] : requiredSecure[service_name]);

	keepConnectionUpTimerIds[timerIdName] = setTimeout(waitConnectionAttempt, config.RECONNECT_WAIT, id, service_name, isSecure, timerIdName, service);
	}

var waitConnectionAttempt = function(id, service_name, isSecure, timerIdName, service)
	{
	core.getService(service_name, "", function(err, serviceObj)
		{
		delete keepConnectionUpTimerIds[timerIdName];									// Timer can now be retriggered

		if(serviceObj)
			connect(service, (!isSecure ? serviceObj.port : serviceObj.securePort), isSecure, function() {});
		else
			disconnectionListener(id, service_name, isSecure);
		});
	}

self.getRequiredService = function(service_name)
	{
	return (required[service_name] ? required[service_name] : null);
	}

self.getRequiredServiceSecure = function(service_name)
	{
	return (requiredSecure[service_name] ? requiredSecure[service_name] : null);
	}

self.keepConnectionUp = function(val)
	{
	keepConnectionUp = (typeof val == "boolean" ? val : false);
	}

	// SERVER SIDE - THE PROVIDED SERVICES - NODE.JS -- -- -- -- -- -- -- -- -- -- //
self.listen = fibrous( function(service_name, port, securePort)
	{
	if(!provided[service_name])															// Create the connection objects
		provided[service_name] = new classes.Service(service_name, true, new classes.WebSocketRpcServer());

	if(!providedSecure[service_name])
		providedSecure[service_name] = new classes.Service(service_name, true, new classes.WebSocketRpcServer());

	listen.sync(provided[service_name], port, false);
	listen.sync(providedSecure[service_name], securePort, true);
	core.sync.registerService(service_name);
	});

var listen = fibrous( function(service, port, isSecure)
	{
	if(service.getIsOpen())
		return;

	service.getServer().listen({ hostname: null, port: port, isSecure: isSecure, key: key, crt: crt, caCrt: caCrt, keepUp: keepServerUp, debug: true });
	});

self.close = function(service_name)
	{ // Close one service, listed services or all services
	var keys;

	if(!service_names)																	// All the services
		keys = Object.keys(required);
	else if(service_name.constructor !== Array)											// One service (string)
		keys = [service_names];

	for(var i = 0; i < keys.length; i++)
		{
		if(keys[i] in provided)
			provided[keys[i]].getServer().close();

		if(keys[i] in providedSecure)
			providedSecure[keys[i]].getServer().close();
		}
	}

self.getProvidedService = function(service_name)
	{
	return (provided[service_name] ? provided[service_name] : null);
	}

self.getProvidedServiceSecure = function(service_name)
	{
	return (providedSecure[service_name] ? providedSecure[service_name] : null);
	}

self.keepServerUp = function(val)
	{
	keepServerUp = (typeof val == "boolean" ? val : false);
	}

}

if(typeof exports !== "undefined")
	module.exports = SpaceifyService;