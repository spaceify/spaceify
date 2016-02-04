/**
 * Spaceify Service by Spaceify Inc. 29.7.2015
 *
 * Implementation for required service. Both applications and web pages can use this. For Spaceifys internal use.
 *
 * @class SpaceifyService
 */

function SpaceifyService()
{
var self = this;

var latest_service_name = "";

var required = {};									// <= Clients
var requireds = {};

var provided = {};									// <= Servers
var provideds = {};

var isNodeJS = (typeof exports !== "undefined" ? true : false);

if(isNodeJS)
	{
	var api_path = process.env.PORT_80 ? "/api/" : "/var/lib/spaceify/code/";

	var fibrous = require("fibrous");
	var Server = require(api_path + "server");
	var config = require(api_path + "config")();
	var _Service = require(api_path + "www/libs/handlers/service.js");
	var _SpaceifyCore = require(api_path + "www/libs/spaceifycore.js");
	var _Communicator = require(api_path + "www/libs/communicator.js");

	var ca_crt = api_path + "www/" + config.SPACEIFY_CRT;
	}
else
	{
	var fibrous = function(code) {};
	var config = new SpaceifyConfig();
	var _Service = Service;
	var _SpaceifyCore = SpaceifyCore;
	var _Communicator = Communicator;

	var ca_crt = "";
	}

var core = new _SpaceifyCore();
var communicator = new _Communicator();

	// CLIENT SIDE - THE REQUIRED SERVICES -- -- -- -- -- -- -- -- -- -- //
var getService = function(service_name, callback)
	{ // Get provided service and try to connect to it
	core.getService(service_name, "", function(err, service)
		{
		if(!required[service_name])
			required[service_name] = new _Service(self);

		if(!requireds[service_name])
			requireds[service_name] = new _Service(self);

		var status_required = required[service.service_name].getStatus();
		var status_requireds = required[service.service_name].getStatus();

		if(!err && isNodeJS)
			{
			fibrous.run(function()
				{
				if(status_required != config.CONNECTED)
					{
					try {
						connection = communicator.sync.connect({hostname: config.EDGE_IP, port: service.port, is_secure: false, persistent: true}, config.WEBSOCKETRPCC);
						required[service.service_name].init(service.service_name, false, connection, err);
						}
					catch(err)
						{
						required[service.service_name].init(service.service_name, false, null, err);
						}
					}

				if(status_requireds != config.CONNECTED)
					{
					try {
						connection = communicator.sync.connect({hostname: config.EDGE_IP, port: service.secure_port, is_secure: true, ca_crt: ca_crt, persistent: true}, config.WEBSOCKETRPCC);
						requireds[service.service_name].init(service.service_name, true, connection, err);
						}
					catch(err)
						{
						requireds[service.service_name].init(service.service_name, true, null, err);
						}
					}

				callback();
				}, function(err, data) {callback} );
			}
		else if(!err && !isNodeJS)
			{
			connect(service.service_name, service.port, false, status_required, function()
				{
				connect(service.service_name, service.secure_port, true, status_requireds, callback);
				});
			}
		else
			callback();
		});
	}

var connect = function(service_name, port, is_secure, status, callback)
	{
	if(status != config.CONNECTED)
		{
		communicator.connect({hostname: config.EDGE_IP, port: port, is_secure: is_secure, persistent: true}, config.WEBSOCKETRPCC, function(err, connection, id)
			{
			(!is_secure ? required[service_name] : requireds[service_name]).init(service_name, is_secure, connection, err);
			callback();
			});
		}
	else
		callback();
	}

	// -- -- -- -- -- -- -- -- -- -- //
self.connectService = 
self.reconnectService = function(service_name, callback)
	{
	self.connectServices([service_name], callback);
	}

self.connectServices = function(service_names, callback)
	{
	if(service_names.length == 0)												// Done
		callback(null, self.getRequiredService(latest_service_name));
	else
		{
		latest_service_name = service_names.pop();
		getService(latest_service_name, function()								// SpaceifyService only connects, Service handles the connection
			{
			self.connectServices(service_names, callback);						// Get next service
			});
		}
	}

self.disconnectService = function(service_name, callback)
	{
	self.disconnectServices([service_name], callback);
	}

self.disconnectServices = function(service_names, callback)
	{
	while(service_names.length > 0)
		{
		var service_name = service_names.pop();

		if(required[service_name])
			{
			required[service_name].disconnect();
			delete required[service_name];
			}

		if(requireds[service_name])
			{
			requireds[service_name].disconnect();
			delete requireds[service_name];
			}
		}

	if(typeof callback == "function")
		callback();
	}

self.getRequiredService = function(service_name)
	{
	if(required[service_name])
		return required[service_name];

	return null;
	}

self.getRequiredServiceSecure = function(service_name)
	{
	if(requireds[service_name])
		return requireds[service_name];

	return null;
	}

	// SERVER SIDE - THE PROVIDED SERVICES (= SERVERS) -- -- -- -- -- -- -- -- -- -- //
self.connectProvided = fibrous( function(service_names, isRealSpaceify, ca_crt, key, crt)
	{
	var server = null;
	var port = config.FIRST_SERVICE_PORT;
	var secure_port = config.FIRST_SERVICE_PORT_SECURE;

	for(var i=0; i<service_names.length; i++)
		{
		var service_name = service_names[i];

		// INSECURE SERVERS -- -- -- -- --
		server = new Server(config.WEBSOCKETRPCS)
		server.sync.connect({hostname: null, port: port, is_secure: false, key: key, crt: crt, ca_crt: ca_crt, user_object: {name: "service_name", value: service_name}, owner: "provSer: " + service_name});

		provided[service_name] = server;

		// SECURE SERVERS -- -- -- -- --
		server = new Server(config.WEBSOCKETRPCS)
		server.sync.connect({hostname: null, port: secure_port, is_secure: true, key: key, crt: crt, ca_crt: ca_crt, user_object: {name: "service_name", value: service_name}, owner: "provSerSec: " + service_name});

		provideds[service_name] = server;

		// -- -- -- -- --
		if(isRealSpaceify)
			core.sync.registerService(service_name);

		port++;
		secure_port++;
		}
	});

self.closeProvided = function(service_names)
	{
	while(service_names.length > 0)
		{
		var service_name = service_names.pop();

		if(provided[service_name])
			{
			provided[service_name].close();
			delete provided[service_name];
			}

		if(provideds[service_name])
			{
			provideds[service_name].close();
			delete provideds[service_name];
			}
		}
	}

self.reconnectProvided = fibrous( function(service_name)
	{
	
	});

self.getProvidedService = function(service_name)
	{
	if(provided[service_name])
		return provided[service_name];

	return null;
	}

self.getProvidedServiceSecure = function(service_name)
	{
	if(provideds[service_name])
		return provideds[service_name];

	return null;
	}

}

if(typeof exports !== "undefined")
	module.exports = SpaceifyService;