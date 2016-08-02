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

function Manager()
{
var self = this;

var logger = new Logger();
var database = new Database();
var errorc = new SpaceifyError();
var config = new SpaceifyConfig();
var utility = new SpaceifyUtility();

var applications = {};

self.start = fibrous( function(opts)
	{
	var returnValue = null;

	if(opts.type == config.SANDBOXED)
		returnValue = startSandboxed.sync(opts);
	else if(opts.type == config.SPACELET)
		returnValue = startSpacelet.sync(opts);
	/*if(opts.type == config.NATIVE)
		returnValue = startSandboxed.sync(opts);*/

	return returnValue;
	});

var startSandboxed = fibrous( function(opts)
	{
	var application = null, dbApps;

	try	{
		if(opts.unique_name)																	// Start one named application
			dbApps = [database.sync.getApplication(opts.unique_name)];
		else																					// Start all applications
			dbApps = database.sync.getApplications([config.SANDBOXED]);
		}
	catch(err)
		{ throw errorc.make(err); }
	finally
		{ database.close(); }

	for(var i = 0; i < dbApps.length; i++)
		{
		try	{
			application = (applications[dbApps[i].unique_name] ? applications[dbApps[i].unique_name] : null);

			if(!application)																	// Is application already build?
				application = build.sync(dbApps[i].docker_image_id, dbApps[i].unique_directory, dbApps[i].unique_name, config.SANDBOXED);

			self.sync.run(application);

			if(!application.isInitialized())
				throw language.E_SANDBOXED_FAILED_INIT_ITSELF.preFmt("SandboxedManager::start", {"~err": application.getInitializationError()});
			}
		catch(err)
			{
			if(opts.throwErrors)
				throw errorc.make(err);
			else
				logger.error(errorc.make(err), true, true, logger.ERROR);
			}
		}
	});

var startSpacelet = fibrous( function(opts)
	{
	var application = null, dbApps;

	try	{
		if(opts.unique_name)																	// Build one application
			dbApps = [database.sync.getApplication(opts.unique_name)];
		else																					// Build all applications
			dbApps = database.sync.getApplications([config.SPACELET]);
		}
	catch(err)
		{ throw errorc.make(err); }
	finally
		{ database.close(); }

	for(var i = 0; i < dbApps.length; i++)
		{
		try	{
			application = (applications[dbApps[i].unique_name] ? applications[dbApps[i].unique_name] : null);

			if(!application)																	// Is application already build?
				application = build.sync(dbApps[i].docker_image_id, dbApps[i].unique_directory, dbApps[i].unique_name, config.SPACELET);

			if(opts.runSpacelet)
				self.sync.run(application);

			if(!application.isInitialized() && opts.runSpacelet && opts.throwErrors)
				throw language.E_SPACELET_FAILED_INIT_ITSELF.preFmt("SpaceletManager::start", {"~err": application.getInitializationError()});
			}
		catch(err)
			{
			if(opts.throwErrors)
				throw errorc.make(err);
			else
				logger.error(errorc.make(err), true, true, logger.ERROR);
			}
		}

	return (opts.unique_name ? application : null);
	});

/*var startNative = fibrous( function(opts)
	{}*/

var build = fibrous( function(docker_image_id, unique_directory, unique_name, type)
	{
	var manifest;
	var application = null;
	var applicationPath = (type == config.SANDBOXED ? config.SANDBOXED_PATH : config.SPACELETS_PATH);

	if((manifest = utility.sync.loadJSON(applicationPath + unique_directory + config.VOLUME_DIRECTORY + config.APPLICATION_DIRECTORY + config.MANIFEST, true)) == null)
		throw language.E_MANAGER_FAILED_TO_READ_MANIFEST.preFmt("Manager::build", {"~type": language.APPLICATION_DISPLAY_NAMES[type], "~unique_name": unique_name});

	application = new Application(manifest);
	application.setDockerImageId(docker_image_id);
	add(application);

	return application;
	});

self.run = fibrous( function(application)
	{
	// Start the application in a Docker container
	try	{
		if(application.isRunning())
			return true;

		var applicationPath = (application.getType() == config.SANDBOXED ? config.SANDBOXED_PATH : config.SPACELETS_PATH);

		var volumes = {};
		volumes[config.VOLUME_PATH] = {};
		volumes[config.API_PATH] = {};

		var binds = [applicationPath + application.getUniqueDirectory() + config.VOLUME_DIRECTORY + ":" + config.VOLUME_PATH + ":rw",
					 config.SPACEIFY_CODE_PATH + ":" + config.API_PATH + ":ro"];

		var dockerContainer = new DockerContainer();
		application.setDockerContainer(dockerContainer);
		dockerContainer.sync.startContainer(application.getProvidesServicesCount(), application.getDockerImageId(), volumes, binds);

		application.createRuntimeServices(dockerContainer.getPublicPorts(), dockerContainer.getIpAddress());

		var response = dockerContainer.sync.runApplication(application);		// [0] = output from the app, [1] = initialization status
		if(response[1] == config.APPLICATION_UNINITIALIZED)
			{
			var matches = /;;(.+)::/.exec(response[0]);							// extract error string from the output
			application.setInitialized(false, matches[1]);
			self.stop(application.getUniqueName());
			}
		else
			application.setInitialized(true, "");

		application.setRunningState(application.isInitialized());
		}
	catch(err)
		{
		var ferr = language.E_MANAGER_FAILED_TO_RUN.preFmt("Manager::run", {"~type": language.APPLICATION_DISPLAY_NAMES[application.getType()], "~unique_name": application.getUniqueName()});
		throw errorc.make(ferr, err);
		}
	});

self.stop = fibrous( function(unique_name)
	{
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
	var result = (applications[unique_name] ? applications[unique_name].isRunning() : false);

	return (result ? result : null);
	}

self.implementsWebServer = function(unique_name)
	{
	var result = (applications[unique_name] ? applications[unique_name].implementsWebServer() : null);

	return (result ? result : null);
	}

self.getApplication = function(unique_name)
	{
	return (applications[unique_name] ? applications[unique_name] : null);
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
	return (applications[unique_name] ? applications[unique_name].getInstallationPath() : null);
	}

self.getManifest = function(unique_name)
	{
	return (applications[unique_name] ? applications[unique_name].getManifest() : null);
	}

self.getType = function(unique_name)
	{
	return (applications[unique_name] ? applications[unique_name].getType() : null);
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
	return (applications[unique_name] ? applications[unique_name].getRuntimeServices() : null);
	}

self.getRequiresServices = function(unique_name)
	{
	return (unique_name in applications ? applications[unique_name].getRequiresServices() : null);
	}

self.getServiceRuntimeStates = function()
	{
	var services, state, status = {};

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
