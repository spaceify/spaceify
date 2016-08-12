"use strict";

/**
 * Application, 2015 Spaceify Oy
 * 
 * @class Application
 */

var SpaceifyConfig = require("./spaceifyconfig");
var ValidateApplication = require("./validateapplication");
var SpaceifyUtility = require("./spaceifyutility");

function Application(manifest)
{
var self = this;

var config = new SpaceifyConfig();
var utility = new SpaceifyUtility();
var validator = new ValidateApplication();

var dockerContainer = null;
var docker_image_id = "";

var runningState = false;
var isInitialized = false;
var initializationError = "";

var runtimeServices = [];

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
	return validator.makeUniqueDirectory(manifest.unique_name);
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

	return path + self.getUniqueDirectory() + config.VOLUME_DIRECTORY + config.APPLICATION_DIRECTORY;
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

self.setRunningState = function(state)
	{
	runningState = state;

	if(!state)
		runtimeServices = [];
	}

self.isRunning = function()
	{
	return runningState;
	}

self.implementsWebServer = function()
	{
	return (manifest.implements && manifest.implements.indexOf(config.WEB_SERVER) != -1 ? true : false);
	}

self.createRuntimeServices = function(ports, ip)
	{ // Create runtime services with their ports and IPs attached to the provided services
	var gps = self.getProvidesServices();
	var fp = config.FIRST_SERVICE_PORT;
	var fps = config.FIRST_SERVICE_PORT_SECURE;

	runtimeServices = [];

	for(var i = 0; i < gps.length; i++)
		{
		runtimeServices.push(	{
								service_name: gps[i].service_name,
								service_type: gps[i].service_type,
								port: ports[i],
								securePort: ports[i + 1],
								containerPort: fp + i,
								secureContainerPort: fps + i,
								ip: ip,
								isRegistered: false,
								unique_name: self.getUniqueName(),
								type: self.getType()
								});
		}

		runtimeServices.push(	{
								service_name: config.HTTP,
								service_type: config.HTTP,
								port: ports[ports.length - 2],
								securePort: ports[ports.length - 1],
								containerPort: 80,
								secureContainerPort: 443,
								ip: ip,
								isRegistered: true,
								unique_name: self.getUniqueName(),
								type: self.getType()
								});
	}

self.getRuntimeServices = function()
	{
	return runtimeServices;
	}

self.getRuntimeServicesCount = function()
	{
	return runtimeServices.length;
	}

self.getRuntimeService = function(service_name, unique_name)
	{
	var uniqueName;
	var serviceName;

	for(var s = 0; s < runtimeServices.length; s++)
		{
		uniqueName = runtimeServices[s].unique_name;
		serviceName = runtimeServices[s].service_name;

		// First condition; all apps have http service and without unique_name finding the service would be ambiguous.
		if( (!unique_name && serviceName == service_name && service_name != config.HTTP) ||
			(unique_name && unique_name == uniqueName && service_name == serviceName) )
			{
			runtimeServices[s].isRunning = self.isRunning();
			return runtimeServices[s];
			}
		}

	return null;
	}

self.registerService = function(service_name, state)
	{ // Returns runtime services when successfully registered/unregistered, null if no such service
	for(var s = 0; s < runtimeServices.length; s++)
		{
		if(runtimeServices[s].service_name == service_name)
			{
			runtimeServices[s].isRegistered = state;						// false=unregistered, true=registered
			return runtimeServices[s];
			}
		}

	return null;
	}

self.setInitialized = function(status, error)
	{
	isInitialized = status;
	initializationError = error;
	}

self.isInitialized = function()
	{
	return isInitialized;
	}

self.getInitializationError = function()
	{
	return initializationError;
	}

}

module.exports = Application;