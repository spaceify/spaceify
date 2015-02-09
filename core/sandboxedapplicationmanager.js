/**
 * Sandboxed application manager, 18.10.2013 Spaceify Inc.
 * 
 * @class SandboxedApplicationManager
 */

var fs = require("fs");
var path = require("path");
var fibrous = require("fibrous");
var Config = require("./config")();
var Const = require("./constants");
var Utility = require("./utility");
var Language = require("./language");
var Database = require("./database");
var SandboxedApplication = require("./sandboxedapplication");
var DockerContainer = require("./dockercontainer");

function SandboxedApplicationManager()
{
var self = this;

var sandboxedApplications = new Object();
var ordinal = 0;

var database = new Database();

self.start = fibrous(function(unique_name)
	{
	try {
		database.open(Config.SPACEIFY_DATABASE_FILEPATH);

		if(unique_name)															// Start one named application
			{
			var application = database.sync.getApplication([unique_name], false);
		
			if(!application)
				throw Utility.ferror(Language.E_SANDBOXEDAPP_START_FAILED_UNKNOWN_UNIQUE_NAME.p("SandboxedApplicationManager::start()"), {":name": unique_name});

			startApp.sync(application);
			}
		else																	// Start all applications
			{
			var applications = database.sync.getApplication([Const.SANDBOXED_APPLICATION], true);
			for(var i = 0; i<applications.length; i++)
				startApp.sync(applications[i]);
			}
		}
	catch(err)
		{
		throw Utility.error(err);
		}
	finally
		{
		database.close();
		}
	});

var startApp = fibrous(function(application)
	{
	var sandboxedApplication = null;

	try {
		sandboxedApplication = self.sync.build(application.docker_image_id, application.unique_directory);

		self.add(sandboxedApplication);

		self.sync.run(sandboxedApplication);

		if(!sandboxedApplication.isInitialized())
			throw Utility.error(Language.E_SANDBOXEDAPP_FAILED_INIT_ITSELF.p("SandboxedApplicationManager::startApp()"));
		}
	catch(err)
		{
		if(sandboxedApplication)
			self.remove(sandboxedApplication);											// Remove incomplete application

		throw Utility.error(err);
		}
	});

self.build = fibrous(function(docker_image_id, unique_directory)
	{ // START SANDBOXED APPLICATION RUNNING IN A DOCKER CONTAINER
	var manifest;
	var sandboxedApplication = null;

	try {
		if((manifest = Utility.sync.loadManifest(Config.SANDBOXEDAPPS_PATH + unique_directory + Config.VOLUME_DIRECTORY + Config.APPLICATION_DIRECTORY + Const.MANIFEST, true)) == null)
			throw Utility.error(Language.E_SANDBOXEDAPP_FAILED_TO_READ_MANIFEST.p("SandboxedApplicationManager::build()"));

		// ToDo: Check manifest rights - are the services provided and required (manifest.requires_services[N].unique_name + manifest.requires_services[N].service_name accepted) in the accepted list for this host and/or sandboxed application

		sandboxedApplication = new SandboxedApplication(manifest);
		sandboxedApplication.setDockerImageId(docker_image_id);
		}
	catch(err)
		{
		throw Utility.error(err);
		}

		return sandboxedApplication;
	});

self.run = fibrous(function(sandboxedApplication)
	{
	var dockerContainer = null;

	try	{
		if(sandboxedApplication.isRunning())
			return true;

		var volumes = {};
		volumes[Config.VOLUME_PATH] = {};
		var binds = [Config.SANDBOXEDAPPS_PATH + sandboxedApplication.getUniqueDirectory() + Config.VOLUME_DIRECTORY + ":" + Config.VOLUME_PATH + ":rw"];
		var dockerContainer = new DockerContainer();
		sandboxedApplication.setDockerContainer(dockerContainer);
		dockerContainer.sync.startContainer(sandboxedApplication.getProvidesServicesCount(), sandboxedApplication.getDockerImageId(), volumes, binds);

		sandboxedApplication.makeServiceMappings(dockerContainer.getPublicPorts(), dockerContainer.getIpAddress());

		dockerContainer.sync.runApplication(sandboxedApplication);

		sandboxedApplication.setRunning(true);

		return sandboxedApplication.getServiceMappings();
		}
	catch(err)
		{
		throw Utility.error(Language.E_SANDBOXEDAPP_FAILED_TO_RUN.p("SandboxedApplicationManager::run()"), err);
		}
	});

self.stop = fibrous(function(sandboxedApplication)
	{
	if((dockerContainer = sandboxedApplication.getDockerContainer()) != null)
		dockerContainer.sync.stopContainer(sandboxedApplication);

	sandboxedApplication.setRunning(false);
	});

self.stopAll = fibrous(function(remove)
	{
	for(i in sandboxedApplications)
		{
		self.sync.stop(sandboxedApplications[i]);
		if(remove)
			delete sandboxedApplications[i];
		}
	});

self.stopByUniqueName = fibrous(function(unique_name, remove)
	{
	sandboxedApplication = self.find("unique_name", unique_name);
	if(sandboxedApplication)
		{
		self.sync.stop(sandboxedApplication);
		if(remove)
			delete sandboxedApplication;
		}
	});

self.add = function(sandboxedApplication)
	{
	var newOrdinal = ++ordinal;
	sandboxedApplication.setOrdinal(newOrdinal);
	sandboxedApplications[newOrdinal] = sandboxedApplication;
	}

self.remove = function(sandboxedApplication)
	{
	if(sandboxedApplication == null)
		return;

	for(i in sandboxedApplications)
		{
		if(sandboxedApplication.getOrdinal() == sandboxedApplications[i].getOrdinal())
			{
			self.sync.stop(sandboxedApplications[i]);
			delete sandboxedApplications[i];
			break;
			}
		}
	}

self.isRunning = function(unique_name)
	{
	var app = self.find("unique_name", unique_name);
	return (app ? app.isRunning() : false);
	}

self.initialized = function(sandboxedApplication, success)
	{
	sandboxedApplication.setInitialized(success);

	if((dc = sandboxedApplication.getDockerContainer()) != null)
		dc.sendClientReadyToStdIn();
	}

self.find = function(_param, _find)
	{ // Find based on _param and _find object
	unique_name = _param.toLowerCase();

	for(i in sandboxedApplications)
		{
		var unique_name = sandboxedApplications[i].getUniqueName();

		if(_param == "path" && _find == unique_name)
			return sandboxedApplications[i].getInstallationPath();
		else if(_param == "unique_name" && _find == unique_name)
			return sandboxedApplications[i];
		else if(_param == "services" && _find == unique_name)
			return sandboxedApplications[i].getServiceMappings();
		else if(_param == "service")
			{
			var service = sandboxedApplications[i].getService(_find.service_name);
			if(service != null || (service != null && service.ip == _find.ip && (_find.service_name == Const.CLIENT_HTTP_SERVER || _find.service_name == Const.CLIENT_HTTPS_SERVER)))	// Application can find its own http(s) services
				return service;
			}
		else if(_param == "remote_address")
			{
			var dc = sandboxedApplications[i].getDockerContainer();
			if(dc != null && dc.getIpAddress() == _find)
				return sandboxedApplications[i];
			}
		else if(_param == "streams")
			{
			var dc = sandboxedApplications[i].getDockerContainer();
			if(dc != null && dc.getContainerId() == _find)
				return dc.getStreams();
			}
		}

	return null;
	}

}

module.exports = SandboxedApplicationManager;
