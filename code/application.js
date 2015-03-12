#!/usr/bin/env node
/**
 * Manifest, 2015 Spaceify Inc.
 * 
 * @class Manifest
 */

var Utility = require("./utility");
var Config = require("./config")();
var Const = require("./constants");

function Application(manifest)
{
var self = this;

var dockerContainer = null;
var docker_image_id = "";

var running = false;
var initialized = false;
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
	return srvc != null ? srvc.length : 0;
	}

self.getProvidesServices = function()
	{
	return manifest.provides_services ? manifest.provides_services : null;
	}

self.getRequiresServicesCount = function()
	{
	var srvc = manifest.requires_services ? manifest.requires_services : null;
	return srvc != null ? srvc.length : 0;
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
	if(self.getType() == Const.SPACELET)
		path = Config.SPACELETS_PATH;
	else if(self.getType() == Const.SANDBOXED_APPLICATION)
		path = Config.SANDBOXED_PATH;
	else if(self.getType() == Const.NATIVE_APPLICATION)
		path = Config.NATIVE_PATH;

	return path + manifest.unique_directory + Config.VOLUME_DIRECTORY + Config.APPLICATION_DIRECTORY;
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

self.makeServices = function(ports, ip)
	{
	services = Utility.makeServices(self.getUniqueName(), self.getProvidesServices(), ports, ip);
	}

self.getServices = function()
	{
	return services;
	}

self.getService = function(service_name, unique_name)
	{ // Get service either by service name or service name and unique_name. Add current running status of application owning this service to the service object.
	service_name = (service_name ? service_name.trim() : service_name);
	unique_name = (unique_name ? unique_name.trim() : unique_name);

	for(var s=0; s<services.length; s++)
		{
		var un = services[s].unique_name;
		var sn = services[s].service_name;

		if((!unique_name && service_name == sn && service_name != Const.CLIENT_HTTP_SERVER && service_name != Const.CLIENT_HTTPS_SERVER) ||
			(unique_name && unique_name == un && service_name == sn))
			{
			services[s].is_running = self.isRunning();
			return services[s];
			}
		}

	return null;
	}

self.registerService = function(service_name, state)
	{
	for(s in services)
		{
		if(services[s].service_name == service_name)
			{
			services[s].registered = state;								// false=unregistered, true=registered
			return services[s];
			}
		}

	return null;														// returns services when successfully registered/unregistered, null if no such service
	}

self.setInitialized = function(status)
	{
	initialized = status;
	}

self.isInitialized = function()
	{
	return initialized;
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
	var gp = null;
	var unique_name = (typeof _param == "string" ? _param.toLowerCase() : _param);

	for(var i in applications)
		{
		var unique_name = applications[i].getUniqueName();

		if(_param == "path" && _find == unique_name)
			return applications[i].getInstallationPath();
		else if(_param == "unique_name" && _find == unique_name)
			return applications[i];
		else if(_param == "manifest" && _find == unique_name)
			return applications[i].getManifest();
		else if(_param == "services" && _find == unique_name)
			return applications[i].getServices();
		else if(_param == "service")
			{
			if((gp = applications[i].getService(_find.service_name, _find.unique_name)))
				return gp;
			}
		else if(_param == "remote_address")
			{
			var dc = applications[i].getDockerContainer();
			if(dc != null && dc.getIpAddress() == _find)
				return applications[i];
			}
		else if(_param == "streams")
			{
			var dc = applications[i].getDockerContainer();
			if(dc != null && dc.getContainerId() == _find)
				return dc.getStreams();
			}
		}

	return null;
	}

}

module.exports = { obj: Application, inst: new Application() };