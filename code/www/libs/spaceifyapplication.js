"use strict";

/**
 * Spaceify application, 25.1.2016 Spaceify Oy
 *
 * @class SpaceifyApplication
 */

function SpaceifyApplication()
{
// NODE.JS / REAL SPACEIFY - - - - - - - - - - - - - - - - - - - -
var isNodeJs = (typeof exports !== "undefined" ? true : false);
var isRealSpaceify = (typeof process !== "undefined" ? process.env.IS_REAL_SPACEIFY : false);
var apiPath = isNodeJs && isRealSpaceify ? "/api/" : "/var/lib/spaceify/code/";

var classes = 	{
				Logger: (isNodeJs ? require(apiPath + "logger") : Logger),
				WebServer: (isNodeJs ? require(apiPath + "webserver") : function() {}),
				SpaceifyCore: (isNodeJs ? require(apiPath + "spaceifycore") : SpaceifyCore),
				SpaceifyConfig: (isNodeJs ? require(apiPath + "spaceifyconfig") : SpaceifyConfig),
				SpaceifyUtility: (isNodeJs ? require(apiPath + "spaceifyutility") : SpaceifyUtility),
				SpaceifyService: (isNodeJs ? require(apiPath + "spaceifyservice") : SpaceifyService)
				};

var fibrous = (isNodeJs ? require("fibrous") : function(fn) { return fn; });
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

var self = this;

var logger = new classes.Logger();
var httpServer = new classes.WebServer();
var httpsServer = new classes.WebServer();
var config = new classes.SpaceifyConfig();
var utility = new classes.SpaceifyUtility();
var spaceifyCore = new classes.SpaceifyCore();
var spaceifyService = new classes.SpaceifyService();

var wwwPath = config.APPLICATION_WWW_PATH;
var manifestPath = config.APPLICATION_PATH || "";
var caCrt = config.API_WWW_PATH + config.SPACEIFY_CRT;
var key = config.APPLICATION_TLS_PATH + config.SERVER_KEY;
var crt = config.APPLICATION_TLS_PATH + config.SERVER_CRT;

var manifest = null;

var HTTP_PORT = (isRealSpaceify ? 80 : 6080);
var HTTPS_PORT = (isRealSpaceify ? 443 : 6443);

self.start = function()
	{
	if(isNodeJs)
		start.apply(self, arguments);
	else
		self.connect.apply(self, arguments);
	}

var start = function(application, options)
	{
	fibrous.run( function()
		{
		var service_name;

		try {
			manifest = utility.sync.loadJSON(manifestPath + config.MANIFEST, true, true);

				// SERVICES -- -- -- -- -- -- -- -- -- -- //
			if(manifest.provides_services)							// <= SERVERS - PROVIDES SERVICES
				{
				var services = manifest.provides_services;

				for(var i = 0; i < services.length; i++)
					spaceifyService.sync.listen(services[i].service_name, config.FIRST_SERVICE_PORT + i, config.FIRST_SERVICE_PORT_SECURE + i);
				}

			if(manifest.requires_services)							// <= CLIENTS - REQUIRES SERVICES
				createRequiredServices.sync(manifest.requires_services);

				// START APPLICATIONS HTTP AND HTTPS WEB SERVERS -- -- -- -- -- -- -- -- -- -- //
			if(options && options.webservers)
				{
				var opts =	{
							hostname: config.ALL_IPV4_LOCAL,
							key: key,
							crt: crt,
							caCrt: caCrt,
							wwwPath: wwwPath,
							indexFile: config.INDEX_HTML,
							serverName: manifest.name + " Server"
							};

				if(options.webservers.http && options.webservers.http === true && !httpServer.getIsOpen())
					{
					opts.isSecure = false;
					opts.port = HTTP_PORT;
					httpServer.listen.sync(opts);
					}

				if(options.webservers.https && options.webservers.https === true && !httpsServer.getIsOpen())
					{
					opts.isSecure = true;
					opts.port = HTTPS_PORT;
					httpsServer.listen.sync(opts);
					}
				}

			if(application.start)
				application.start();

				// APPLICATION INITIALIALIZED SUCCESSFULLY -- -- -- -- -- -- -- -- -- -- //
			console.log(config.APPLICATION_INITIALIZED, "-", manifest.unique_name);
			}
		catch(err)
			{
			if(application.fail)
				application.fail(err);

			initFail.sync(err);
			}
		}, function(err, data)
			{
			//initFail.sync(err);
			});
	}

self.connect = function(application, unique_names, options)
	{ // Setup connections to open services of applications and spacelets; open, open_local or both depending from where this method is called
	try {
		if(unique_names.constructor !== Array)													// getOpenServices takes an array of unique names
			unique_names = [unique_names];

		spaceifyCore.getOpenServices(unique_names, function(err, services)
			{
			if(err)
				throw err;
			else
				connectServices(application, services);
			});
		}
	catch(err)
		{
		if(typeof application == "function")
			application(err, false);
		else if(application && application.fail)
			application.fail(err);
		}
	}

var connectServices = function(application, services)
	{ // Connect to services in the array one at a time
	var service = services.shift();

	if(typeof service === "undefined")
		{
		if(typeof application == "function")
			application(null, true);
		else if(application && application.start)
			application.start();

		return;
		}

	spaceifyService.connect(service.service_name, function(err, data)
		{
		connectServices(application, services);
		});
	}

var initFail = fibrous( function(err)
	{ // FAILED TO INITIALIALIZE THE APPLICATION. -- -- -- -- -- -- -- -- -- -- //
	logger.error([";;", err, "::"], true, true, logger.ERROR);
	console.log(manifest.unique_name + config.APPLICATION_UNINITIALIZED);

	stop.sync();
	});

var stop = fibrous( function()
	{
	httpServer.sync.close();
	httpsServer.sync.close();

	spaceifyService.disconnect();								// Disconnect all clients
	spaceifyService.close();									// Close all servers
	});

var createRequiredServices = function(services, callback)
	{
	for(var i = 0; i < services.length; i++)
		spaceifyService.connect(services[i].service_name, (i + 1 != services.length ? null : callback));
	}

	// METHODS -- -- -- -- -- -- -- -- -- -- //
self.getOwnUrl = function(isSecure)
	{
	if(!isNodeJs)
		return null;

	var httpPort = (isRealSpaceify ? process.env.PORT_80 : HTTP_PORT);
	var httpsPort = (isRealSpaceify ? process.env.PORT_443 : HTTPS_PORT);

	var port = (!isSecure ? httpPort : httpsPort);
	var ownUrl = (!isSecure ? "http://" : "https://") + config.EDGE_HOSTNAME + ":" + port;

	return ownUrl;
	}

self.getManifest = function()
	{
	return manifest;
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

	// PROVIDED (= SERVICE) -- -- -- -- -- -- -- -- -- -- //
self.getProvidedService = function(service_name)
	{
	return spaceifyService.getProvidedService(service_name);
	}

self.getProvidedServiceSecure = function(service_name)
	{
	return spaceifyService.getProvidedServiceSecure(service_name);
	}

}

if(typeof exports !== "undefined")
	module.exports = new SpaceifyApplication();
