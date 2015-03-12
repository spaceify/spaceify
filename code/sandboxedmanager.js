/**
 * Sandboxed application manager, 18.10.2013 Spaceify Inc.
 * 
 * @class SandboxedManager
 */

var fs = require("fs");
var path = require("path");
var fibrous = require("fibrous");
var Config = require("./config")();
var Const = require("./constants");
var Utility = require("./utility");
var Language = require("./language");
var Database = require("./database");
var Application = require("./application");
var DockerContainer = require("./dockercontainer");

function SandboxedManager()
{
var self = this;

var applications = new Object();
var ordinal = 0;

var database = new Database();

self.start = fibrous( function(unique_name)
	{
	var application = null;
	var _applications = null;

	try {
		database.open(Config.SPACEIFY_DATABASE_FILE);

		if(unique_name)															// Start one named application
			_applications = [database.sync.getApplication([unique_name], false)];
		else																	// Start all applications
			_applications = database.sync.getApplication([Const.SANDBOXED_APPLICATION], true);

		for(var i=0; i<_applications.length; i++)
			{
			application = self.sync.build(_applications[i].docker_image_id, _applications[i].unique_directory);

			self.add(application);

			self.sync.run(application);

			if(!application.isInitialized())
				throw Utility.error(Language.E_SANDBOXED_FAILED_INIT_ITSELF.p("SandboxedManager::start()"));
			}
		}
	catch(err)
		{
		if(application)
			self.remove(application);											// Remove incomplete application
			
		throw Utility.error(err);
		}
	finally
		{
		database.close();
		}
	});

self.build = fibrous( function(docker_image_id, unique_directory)
	{ // START SANDBOXED APPLICATION RUNNING IN A DOCKER CONTAINER
	var manifest = null;
	var application = null;

	try {
		if((manifest = Utility.sync.loadManifest(Config.SANDBOXED_PATH + unique_directory + Config.VOLUME_DIRECTORY + Config.APPLICATION_DIRECTORY + Const.MANIFEST, true)) == null)
			throw Utility.error(Language.E_SANDBOXED_FAILED_TO_READ_MANIFEST.p("SandboxedManager::build()"));

		application = new Application.obj(manifest);
		application.setDockerImageId(docker_image_id);
		}
	catch(err)
		{
		throw Utility.error(err);
		}

		return application;
	});

self.run = fibrous( function(application)
	{
	// Start the application in Docker container
	try	{
		if(application.isRunning())
			return true;

		var volumes = {};
		volumes[Config.VOLUME_PATH] = {};
		volumes[Config.API_PATH] = {};

		var binds = [Config.SANDBOXED_PATH + application.getUniqueDirectory() + Config.VOLUME_DIRECTORY + ":" + Config.VOLUME_PATH + ":rw",
					 Config.SPACEIFY_CODE_PATH + ":" + Config.API_PATH + ":r"];

		var dockerContainer = new DockerContainer();
		application.setDockerContainer(dockerContainer);
		dockerContainer.sync.startContainer(application.getProvidesServicesCount(), application.getDockerImageId(), volumes, binds);

		application.makeServices(dockerContainer.getPublicPorts(), dockerContainer.getIpAddress());

		dockerContainer.sync.runApplication(application);

		application.setRunning(true);

		return application.getServices();
		}
	catch(err)
		{
		throw Utility.error(Language.E_SANDBOXED_FAILED_TO_RUN.p("SandboxedManager::run()"), err);
		}
	});

self.stop = fibrous( function(application)
	{
	if(typeof application == "string")
		application = self.find("unique_name", application);
	
	if((dockerContainer = application.getDockerContainer()) != null)
		dockerContainer.sync.stopContainer(application);

	application.setRunning(false);
	});

self.add = function(application)
	{
	application.setOrdinal(++ordinal);
	applications[ordinal] = application;
	}

self.remove = function(application)
	{
	if(typeof application == "string")
		application = self.find("unique_name", application);

	for(i in applications)
		{
		if(application.getOrdinal() == applications[i].getOrdinal())
			{
			self.sync.stop(applications[i]);
			delete applications[i];
			break;
			}
		}
	}

self.removeAll = fibrous( function()
	{
	for(i in applications)
		self.sync.stop(applications[i]);
	});

self.isRunning = function(unique_name)
	{
	var app = self.find("unique_name", unique_name);
	return (app ? app.isRunning() : false);
	}

self.find = function(_param, _find)
	{ // Find based on _param and _find object
	return Application.inst.find(applications, _param, _find);
	}

self.initialized = function(application, success)
	{
	application.setInitialized(success);

	if((dc = application.getDockerContainer()) != null)
		dc.sendClientReadyToStdIn();
	}

}

module.exports = SandboxedManager;
