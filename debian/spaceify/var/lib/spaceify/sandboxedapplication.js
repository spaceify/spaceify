#!/usr/bin/env node
/**
 * SandboxedApplication, 18.10.2013 Spaceify Inc.
 * 
 * @class SandboxedApplication
 */

var Utility = require("./utility");
var Config = require("./config")();

function SandboxedApplication(manifest)
{
var self = this;

var dockerContainer = null;
var docker_image_id = "";

var running = false;
var initialized = false;
var ordinal = -1;

var serviceMappings = [];

// MANIFEST
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

/*self.isShared = function()
	{
	return manifest.shared;
	}*/

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
	var srvc = typeof manifest.provides_services != "undefined" ? manifest.provides_services : null;
	return srvc != null ? srvc.length : 0;
	}

self.getProvidesServices = function()
	{
	return typeof manifest.provides_services != "undefined" ? manifest.provides_services : null;
	}

self.getRequiresServicesCount = function()
	{
	var srvc = typeof manifest.requires_services != "undefined" ? manifest.requires_services : null;
	return srvc != null ? srvc.length : 0;
	}

self.getRequiresServices = function()
	{
	return typeof manifest.requires_services != "undefined" ? manifest.requires_services : null;
	}

self.getInstallCommands = function()
	{
	return (manifest.install_commands ? manifest.install_commands : []);
	}

// GENERATED
self.getInstallationPath = function()
	{
	return Config.SANDBOXEDAPPS_PATH + manifest.unique_directory + Config.VOLUME_DIRECTORY + Config.APPLICATION_DIRECTORY;
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

self.makeServiceMappings = function(ports, ip)
	{
	serviceMappings = Utility.makeServiceMappings(self.getUniqueName(), self.getProvidesServices(), ports, ip);
	}

self.getServiceMappings = function()
	{
	return serviceMappings;
	}

self.getService = function(service_name)
	{
	for(s in serviceMappings)
		{
		if(serviceMappings[s].service_name == service_name)
			return serviceMappings[s];
		}

	return null;
	}

self.registerService = function(service_name, state)
	{
	for(s in serviceMappings)
		{
		if(serviceMappings[s].service_name == service_name)
			{
			serviceMappings[s].registered = state;						// false=unregistered, true=registered
			return true;
			}
		}

	return false;														// returns true=successful registering/unregistering, false=no such service (service_name)
	}

// Sandboxed application returns its status: true = successfully initialized itself, false = failed to initialize itself
self.setInitialized = function(status)
	{
	initialized = status;
	}
self.isInitialized = function()
	{
	return initialized;
	}

// Unique identifier in stored sandboxed application (SandboxedApplicationManager::sandboxedApplications, SandboxedApplicationManager::ordinal)
self.setOrdinal = function(ordinal_)
	{
	ordinal = ordinal_;
	}
self.getOrdinal = function()
	{
	return ordinal;
	}

}

module.exports = SandboxedApplication;				// Export class not object so that multiple instances can be created
