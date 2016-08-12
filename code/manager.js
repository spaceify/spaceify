"use strict";

/**
 * Manager, 22.10.2015 Spaceify Oy
 * 
 * Spacelet, sandboxed application and native application manager class.
 * 
 * @class Manager
 */

var fibrous = require("fibrous");
var Logger = require("./logger");
var Database = require("./database");
var language = require("./language");
var Application = require("./application");
var SpaceifyError = require("./spaceifyerror");
var SpaceifyConfig = require("./spaceifyconfig");
var SpaceifyUtility = require("./spaceifyutility");
var DockerContainer = require("./dockercontainer");

function Manager(managerType)
{
var self = this;

var logger = new Logger();
var database = new Database();
var errorc = new SpaceifyError();
var config = new SpaceifyConfig();
var utility = new SpaceifyUtility();

var applications = {};

self.install = fibrous( function(unique_name, throws)
	{
	var dbApp;
	var application = null;

	try	{
		dbApp = database.sync.getApplication(unique_name);

		application = build.sync(dbApp.docker_image_id, dbApp.unique_directory, dbApp.unique_name);
		}
	catch(err)
		{
		if(throws)
			throw errorc.make(err);
		}
	finally
		{
		database.close();
		}

	return true;
	});

var build = fibrous( function(docker_image_id, unique_directory, unique_name)
	{
	var manifest;
	var application = null;
	var applicationPath = "";

	if(managerType == config.SPACELET)
		applicationPath = config.SPACELETS_PATH;
	else if(managerType == config.SANDBOXED)
		applicationPath = config.SANDBOXED_PATH;
	/*else if(managerType == config.NATIVE)
		applicationPath = config.NATIVE_PATH;*/

	if((manifest = utility.sync.loadJSON(applicationPath + unique_directory + config.VOLUME_DIRECTORY + config.APPLICATION_DIRECTORY + config.MANIFEST, true)) == null)
		throw language.E_BUILD_READ_MANIFEST_FAILED.preFmt("Manager::build", {"~type": language.APP_DISPLAY_NAMES[managerType], "~unique_name": unique_name});

	application = new Application(manifest);
	application.setDockerImageId(docker_image_id);
	add(application);

	return application;
	});

self.start = fibrous( function(unique_name)
	{
	var startObject = {};
	var application = null;

	try	{
		application = applications[unique_name];

		self.sync.run(application);

		if(!application.isInitialized())
			{
			throw language.E_START_INIT_FAILED.preFmt("Manager::start", {	"~err": application.getInitializationError(), 
																			"~type": language.APP_UPPER_CASE_DISPLAY_NAMES[application.managerType]});
			}

		startObject = { providesServices: application.getProvidesServices() };
		}
	catch(err)
		{
		throw errorc.make(err);
		}

	return startObject;
	});

self.run = fibrous( function(application)
	{ // Starts the application in a Docker container
	var ferr;
	var matches;
	var response;
	var binds = [];
	var volumes = {};
	var dockerContainer;
	var applicationPath = "";

	try	{
		if(application.isRunning())
			return true;

		if(managerType == config.SPACELET)
			applicationPath = config.SPACELETS_PATH;
		else if(managerType == config.SANDBOXED)
			applicationPath = config.SANDBOXED_PATH;
		/*else if(managerType == config.NATIVE)
			applicationPath = config.NATIVE_PATH;*/

		volumes[config.API_PATH] = {};
		volumes[config.VOLUME_PATH] = {};

		binds = [applicationPath + application.getUniqueDirectory() + config.VOLUME_DIRECTORY + ":" + config.VOLUME_PATH + ":rw",
				 config.SPACEIFY_CODE_PATH + ":" + config.API_PATH + ":ro"];

		dockerContainer = new DockerContainer();
		application.setDockerContainer(dockerContainer);
		dockerContainer.sync.startContainer(application.getProvidesServicesCount(), application.getDockerImageId(), volumes, binds);

		application.createRuntimeServices(dockerContainer.getPublicPorts(), dockerContainer.getIpAddress());

		response = dockerContainer.sync.runApplication(application);			// [0] = output from the app, [1] = initialization status
		if(response[1] == config.APPLICATION_UNINITIALIZED)
			{
			matches = /;;(.+)::/.exec(response[0]);								// extract error string from the output
			application.setInitialized(false, matches[1]);
			self.stop(application.getUniqueName());
			}
		else
			application.setInitialized(true, "");

		application.setRunningState(application.isInitialized());
		}
	catch(err)
		{
		ferr = language.E_RUN_FAILED_TO_RUN.preFmt("Manager::run", {"~type": language.APP_DISPLAY_NAMES[managerType], "~unique_name": application.getUniqueName()});
		throw errorc.make(ferr, err);
		}
	});

self.stop = fibrous( function(unique_name)
	{
	var dockerContainer;
	var application = self.getApplication(unique_name);

	if(application)
		{
		if((dockerContainer = application.getDockerContainer()) != null)
			dockerContainer.sync.stopContainer(application);

		application.setRunningState(false);
		}
	});

var add = function(application)
	{
	applications[application.getUniqueName()] = application;
	}

self.remove = fibrous( function(unique_name)
	{
	var keys = Object.keys(applications);								// Deleting seems to work reliably only in "normal" loop

	for(var i = 0; i < keys.length; i++)
		{
		if(keys[i] == unique_name || unique_name == "")
			{
			self.sync.stop(keys[i]);
			delete applications[keys[i]];
			}
		}
	});

self.removeAll = fibrous( function()
	{
	self.sync.remove("");
	});

	// -- -- -- -- -- -- -- -- -- -- //
self.isRunning = function(unique_name)
	{
	return (unique_name in applications ? applications[unique_name].isRunning() : null);
	}

self.implementsWebServer = function(unique_name)
	{
	return (unique_name in applications ? applications[unique_name].implementsWebServer() : null);
	}

self.getApplication = function(unique_name)
	{
	return (unique_name in applications ? applications[unique_name] : null);
	}

self.getApplicationByIp = function(ip)
	{
	var dc;

	for(var unique_name in applications)
		{
		dc = applications[unique_name].getDockerContainer();
		if(dc && dc.getIpAddress() == ip)
			return applications[unique_name];
		}

	return null;
	}

self.getInstallationPath = function(unique_name)
	{
	return (unique_name in applications ? applications[unique_name].getInstallationPath() : null);
	}

self.getManifest = function(unique_name)
	{
	return (unique_name in applications ? applications[unique_name].getManifest() : null);
	}

self.getType = function(unique_name)
	{
	return (unique_name in applications ? applications[unique_name].getType() : null);
	}

self.getRuntimeService = function(search)
	{ // Manifests provided services are the runtime services
	var service = null;

	for(var unique_name in applications)
		{
		if((service = applications[unique_name].getRuntimeService(search.service_name, search.unique_name)))
			break;
		}

	return service;
	}

self.getRuntimeServices = function(unique_name)
	{
	return (unique_name in applications ? applications[unique_name].getRuntimeServices() : null);
	}

self.getRequiresServices = function(unique_name)
	{
	return (unique_name in applications ? applications[unique_name].getRequiresServices() : null);
	}

self.getServiceRuntimeStates = function()
	{
	var state;
	var services;
	var status = {};

	for(var unique_name in applications)
		{
		state = [];
		services = applications[unique_name].getRuntimeServices();

		if(services.length > 0)
			{
			for(var i = 0; i < services.length; i++)
				state.push(	{
							service_name: services[i].service_name,
							service_type: services[i].service_type,
							port: services[i].port,
							securePort: services[i].securePort,
							containerPort: services[i].containerPort,
							secureContainerPort: services[i].secureContainerPort,
							ip: services[i].ip,
							isRegistered: services[i].isRegistered
							});

			status[unique_name] = state;
			}
		}

	return status;
	}

/*self.getStreams = function(search)
	{
	var dc = applications[i].getDockerContainer();
	if(dc && dc.getContainerId() == search)
		return dc.getStreams();
	}*/

}

module.exports = Manager;
