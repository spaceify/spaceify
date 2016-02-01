#!/usr/bin/env node
/**
 * Application, 2015 Spaceify Inc.
 * 
 * @class Application
 */

var utility = require("./utility");
var config = require("./config")();

function Application(manifest)
{
var self = this;

var dockerContainer = null;
var docker_image_id = "";

var running = false;
var initialized = false;
var initializationError = "";
var ordinal = -1;

var services = [];

// MANIFEST FIELDS
self.getManifest = function()
	{
	return manifest;
	}

self.getName = function()
	{
	return manifest.name;
	}

self.getVersion = function()
	{
	return manifest.version;
	}

self.getStartCommand = function()
	{
	return manifest.start_command;
	}

self.getStopCommand = function()
	{
	return (manifest.stop_command ? manifest.stop_command : "");
	}

self.getUniqueName = function()
	{
	return manifest.unique_name;
	}

self.isShared = function()
	{
	return manifest.shared;
	}

self.getType = function()
	{
	return manifest.type;
	}

self.getUniqueDirectory = function()
	{
	return manifest.unique_directory;
	}

self.getProvidesServicesCount = function()
	{
	var srvc = manifest.provides_services ? manifest.provides_services : null;
	return srvc ? srvc.length : 0;
	}

self.getProvidesServices = function()
	{
	return manifest.provides_services ? manifest.provides_services : null;
	}

self.getRequiresServicesCount = function()
	{
	var srvc = manifest.requires_services ? manifest.requires_services : null;
	return srvc ? srvc.length : 0;
	}

self.getRequiresServices = function()
	{
	return manifest.requires_services ? manifest.requires_services : null;
	}

self.getInstallCommands = function()
	{
	return (manifest.install_commands ? manifest.install_commands : []);
	}

// GENERATED
self.getInstallationPath = function()
	{
	var path = "";
	if(self.getType() == config.SPACELET)
		path = config.SPACELETS_PATH;
	else if(self.getType() == config.SANDBOXED)
		path = config.SANDBOXED_PATH;
	else if(self.getType() == config.NATIVE)
		path = config.NATIVE_PATH;

	return path + manifest.unique_directory + config.VOLUME_DIRECTORY + config.APPLICATION_DIRECTORY;
	}

self.setDockerContainer = function(container)
	{
	dockerContainer = container;
	}

self.getDockerContainer = function()
	{
	return dockerContainer;
	}

self.setDockerImageId = function(id)
	{
	docker_image_id = id;
	}

self.getDockerImageId = function()
	{
	return docker_image_id;
	}

self.setRunning = function(mode)
	{
	running = mode;
	}

self.isRunning = function()
	{
	return running;
	}

self.implementsWebServer = function()
	{
	return (manifest.implements && manifest.implements.indexOf(config.WEB_SERVER) != -1 ? true : false);
	}

self.makeServices = function(ports, ip)
	{ // Run time services with their ports and IPs attached to the provided services
	services = [];
	var pservices = self.getProvidesServices();

	for(var i=0; i<pservices.length; i++)
		services.push({unique_name: manifest.unique_name, service_name: pservices[i].service_name, service_type: pservices[i].service_type, port: ports[i], secure_port: ports[i + 1], ip: ip, registered: false, type: self.getType()});

	services.push({unique_name: manifest.unique_name, service_name: config.HTTP_SERVICE, service_type: config.HTTP_SERVICE, port: ports[ports.length - 2], ip: ip, registered: true, type: self.getType()});
	services.push({unique_name: manifest.unique_name, service_name: config.HTTPS_SERVICE, service_type: config.HTTPS_SERVICE, port: ports[ports.length - 1], ip: ip, registered: true, type: self.getType()});
	}

self.getServices = function()
	{
	return services;
	}

self.getServicesCount = function()
	{
	return services.length;
	}

self.getService = function(service_name, unique_name)
	{ // Get service either by service name or service name and unique_name. Add current running status of application owning this service to the service object.
	service_name = (service_name ? service_name.trim() : service_name);
	unique_name = (unique_name ? unique_name.trim() : unique_name);

	for(var s=0; s<services.length; s++)
		{
		var un = services[s].unique_name;
		var sn = services[s].service_name;

		// First condition = all applications have http and https services and they can be requested only by defining unique name. Otherwise return the requested service.
		// Second condition = only this rule can return http and https services. otherwise this rule is nonrelevant, because service names are unique among appliciations.
		if( (!unique_name && service_name == sn && service_name != config.HTTP_SERVICE && service_name != config.HTTP_SERVICE) ||
			(unique_name && unique_name == un && service_name == sn) )
			{
			services[s].is_running = self.isRunning();
			return services[s];
			}
		}

	return null;
	}

self.registerService = function(service_name, state)
	{
	for(var s=0; s<services.length; s++)
		{
		if(services[s].service_name == service_name)
			{
			services[s].registered = state;								// false=unregistered, true=registered
			return services[s];
			}
		}

	return null;														// returns services when successfully registered/unregistered, null if no such service
	}

self.setInitialized = function(status, error)
	{
	initialized = status;
	initializationError = error;
	}

self.isInitialized = function()
	{
	return initialized;
	}

self.getInitializationError = function()
	{
	return initializationError;
	}

self.setOrdinal = function(ordinal_)
	{ // Unique identifier for stored application
	ordinal = ordinal_;
	}

self.getOrdinal = function()
	{
	return ordinal;
	}

// UTILITY FUNCTIONS FOR APPLICATIONS
self.find = function(applications, _param, _find)
	{
	var gp = null, unique_name;

	for(var i in applications)
		{
		unique_name = applications[i].getUniqueName();

		if(_param == "path" && _find == unique_name)
			return applications[i].getInstallationPath();

		else if(_param == "application" && _find == unique_name)
			return applications[i];

		else if(_param == "manifest" && _find == unique_name)
			return applications[i].getManifest();

		else if(_param == "is_running" && _find == unique_name)
			return applications[i].isRunning();

		else if(_param == "implements_web_server"  && _find == unique_name)
			return applications[i].implementsWebServer();

		else if(_param == "type" && _find == unique_name)
			return applications[i].getType();

		else if(_param == "service")
			{
			if((gp = applications[i].getService(_find.service_name, _find.unique_name)))
				return gp;
			}

		else if(_param == "container_ip")
			{
			var dc = applications[i].getDockerContainer();
			if(dc && dc.getIpAddress() == _find)
				return applications[i];
			}

		else if(_param == "streams")
			{
			var dc = applications[i].getDockerContainer();
			if(dc && dc.getContainerId() == _find)
				return dc.getStreams();
			}

		}

	return null;
	}

}

module.exports = { obj: Application, inst: new Application() };