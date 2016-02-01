/**
 * Spaceify application by Spaceify Inc. 25.1.2016
 *
 * @class SpaceifyApplication
 */

var isRealSpaceify = process.env.PORT_80;

var api_path = isRealSpaceify ? "/api/" : "/var/lib/spaceify/code/";

var fs = require("fs");
var fibrous = require("fibrous");
var logger = require(api_path + "logger");
var utility = require(api_path + "utility");
var config = require(api_path + "config")();
var WebServer = require(api_path + "webserver");
var SpaceifyService = require(api_path + "www/libs/spaceifyservice");

if(isRealSpaceify)
	{
	HTTP_PORT = 80;
	HTTPS_PORT = 443;
	}
else
	{
	HTTP_PORT = 6080;
	HTTPS_PORT = 6443;
	}

function SpaceifyApplication()
{
var self = this;

var httpServer = new WebServer();
var httpsServer = new WebServer();
var spaceifyService = new SpaceifyService();
var www_path = config.APPLICATION_WWW_PATH;
var manifest_path = config.APPLICATION_PATH || "";
var ca_crt = config.API_WWW_PATH + config.SPACEIFY_CRT;
var key = config.APPLICATION_TLS_PATH + config.SERVER_KEY;
var crt = config.APPLICATION_TLS_PATH + config.SERVER_CRT;

var provides_service_names = [];
var requires_service_names = [];

self.start = function(app, options)
	{
	fibrous.run( function()
		{
		try
			{
			var manifest = utility.sync.loadJSON(manifest_path + config.MANIFEST, true, true);

				// SERVICES -- -- -- -- -- -- -- -- -- -- //
			if(manifest.provides_services)							// <= SERVERS
				{
				for(var i=0; i<manifest.provides_services.length; i++)
					provides_service_names.push(manifest.provides_services[i].service_name);

				spaceifyService.sync.connectProvided(provides_service_names, isRealSpaceify, ca_crt, key, crt);
				}

			if(manifest.requires_services)							// <= CLIENTS
				{
				for(var i=0; i<manifest.requires_services.length; i++)
					requires_service_names.push(manifest.requires_services[i].service_name);

				spaceifyService.sync.connectServices(requires_service_names);
				}

				// START APPLICATIONS HTTP AND HTTPS WEB SERVERS -- -- -- -- -- -- -- -- -- -- //
			if(options && options.webservers)
				{
				var opts =	{
							hostname: null,
							key: key, 
							crt: crt, 
							ca_crt: ca_crt, 
							www_path: www_path, 
							index_file: "index.html",
							server_name: manifest.name + " Server",
							owner: "SpaceifyApplication"
							};

				if(options.webservers.http)
					{
					opts.is_secure = false;
					opts.port = HTTP_PORT;
					httpServer.connect.sync(opts);
					}

				if(options.webservers.https)
					{
					opts.is_secure = true;
					opts.port = HTTPS_PORT;
					httpsServer.connect.sync(opts);
					}
				}

			app.start();

				// APPLICATION INITIALIALIZED SUCCESSFULLY -- -- -- -- -- -- -- -- -- -- //
			console.log(config.CLIENT_APPLICATION_INITIALIZED);
			}
		catch(err)
			{
			app.fail();

			initFail.sync(err);
			}
		}, function(err, data)
			{
			//initFail.sync(err);
			});
	}

var initFail = fibrous( function(err)
	{ // FAILED TO INITIALIALIZE THE APPLICATION. OUTPUT THE ERROR MESSAGE TO THE CORE -- -- -- -- -- -- -- -- -- -- //
	logger.error("{{" + (err && err.message ? err.message : "undefined error") + "}}");
	console.log(config.CLIENT_APPLICATION_UNINITIALIZED);

	stop.sync();
	});

var stop = fibrous( function()
	{
	httpServer.sync.close();
	httpsServer.sync.close();

	spaceifyService.disconnectServices(requires_service_names);						// Disconnect all clients
	spaceifyService.closeProvided(provides_service_names);							// Close all servers
	});

	// METHODS -- -- -- -- -- -- -- -- -- -- //
self.getOwnUrl = function(is_secure)
	{
	var port = (!is_secure ? process.env.PORT_80 : process.env.PORT_443);
	var ownUrl = (!is_secure ? "http://" : "https://") + config.EDGE_HOSTNAME + ":" + port;

	return ownUrl;
	}

	// REQUIRED (= CLIENT) -- -- -- -- -- -- -- -- -- -- //
self.getRequiredService = function(service_name)
	{
	return spaceifyService.getRequiredService(service_name);
	}

self.getRequiredServiceSecure = function(service_name)
	{
	return spaceifyService.getRequiredServiceSecure(service_name);
	}

self.exposeRpcMethodRequired = function (name, object, method, service_name)
	{
	spaceifyService.getRequiredService(service_name).exposeRpcMethod(name, object, method);
	spaceifyService.getRequiredServiceSecure(service_name).exposeRpcMethod(name, object, method);
	}

self.setConnectionListenersRequired = function(listener, service_name)
	{
	spaceifyService.getRequiredService(service_name).setConnectionListener(listener);
	spaceifyService.getRequiredServiceSecure(service_name).setConnectionListener(listener);
	}

self.setDisconnectionListenersRequired = function(listener, service_name)
	{
	spaceifyService.getRequiredService(service_name).setDisconnectionListener(listener);
	spaceifyService.getRequiredServiceSecure(service_name).setDisconnectionListener(listener);
	}

	// PROVIDED (= SERVICE) -- -- -- -- -- -- -- -- -- -- //
self.getProvidedService = function(service_name)
	{
	return spaceifyService.getProvidedService(service_name);
	}

self.getProvidedServiceSecure = function(service_name)
	{
	return spaceifyService.getProvidedServiceSecure(service_name);
	}

self.exposeRpcMethodProvided = function (name, object, method, service_name)
	{
	spaceifyService.getProvidedService(service_name).exposeRpcMethod(name, object, method);
	spaceifyService.getProvidedServiceSecure(service_name).exposeRpcMethod(name, object, method);
	}

self.setConnectionListenersProvided = function(listener, service_name)
	{
	spaceifyService.getProvidedService(service_name).setConnectionListener(listener);
	spaceifyService.getProvidedServiceSecure(service_name).setConnectionListener(listener);
	}

self.setDisconnectionListenersProvided = function(listener, service_name)
	{
	spaceifyService.getProvidedService(service_name).setDisconnectionListener(listener);
	spaceifyService.getProvidedServiceSecure(service_name).setDisconnectionListener(listener);
	}

}

module.exports = new SpaceifyApplication();
