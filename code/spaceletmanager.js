/**
 * Spacelet Manager, 2013 Spaceify Inc.
 * SpaceletManager is a class for managing Spacelets and their processes. It launches spacelet processes, manages their quotas and access rights and terminates them when needed.
 *
 * @class SpaceletManager
 */

var fs = require("fs");
var fibrous = require("fibrous");
var Config = require("./config")();
var Utility = require("./utility");
var Language = require("./language");
var Application = require("./application");
var Database = require("./database");
var DockerContainer = require("./dockercontainer");

function SpaceletManager()
{
var self = this;

var applications = Object();
var ordinal = 0;

var database = new Database();

var isStarting = false;
var delayedStart = [];

self.start = function(unique_name, callback)
	{
	var application = null;

	if(isStarting)																			// Start one application at a time - retain call order
		delayedStart.push({"unique_name": unique_name, "callback": callback});
	else
		{
		isStarting = true;

		try {
			var build_application = self.find(applications, "unique_name", unique_name);		// Application by this unique name alredy build?

			// SHARE SPACELET OR START A NEW
			//if(!build_application || (build_application && !build_application.isShared()))	// 'No' OR 'yes and is not shared' -> add the build application to the applications
			//	{
			//	application = self.build.sync(unique_name);
			//	add(application);
			//	}
			//else if(build_application && build_application.isShared())						// 'Yes and is shared' -> use the existing application
			//	application = build_application;

			// SPACELETS ARE NOW SHARED BY DEFAULT - CREATE IF SPACELET DOESN'T EXIST
			if(!build_application)
				{
				application = self.build.sync(unique_name);
				add(application);
				}
			else
				application = build_application;

			// START APPLICATION
			run.sync(application);

			if(!application.isInitialized())
				throw Utility.error(Language.E_SPACELET_FAILED_INIT_ITSELF.p("SpaceletManager::start()"));

			callback(null, application);
			}
		catch(err)
			{
			callback(Utility.error(err), null);
			}

		isStarting = false;

		if(delayedStart.length != 0)														// Start next application?
			{
			var sp = delayedStart.splice(0, 1);
			self.start(sp[0].unique_name, sp[0].callback);
			}
		}
	}

self.build = fibrous( function(unique_name)
	{
	var application = null;
	var _applications = null;

	try {
		database.open(Config.SPACEIFY_DATABASE_FILE);

		if(unique_name)																	// Build one application
			_applications = [database.sync.getApplication(unique_name)];
		else																			// Build all applications
			_applications = database.sync.getApplication([Config.SPACELET], true);

		for(var i=0; i<_applications.length; i++)
			{
			if((manifest = Utility.sync.loadManifest(Config.SPACELETS_PATH + _applications[i].unique_directory + Config.VOLUME_DIRECTORY + Config.APPLICATION_DIRECTORY + Config.MANIFEST, true)) == null)
				throw Utility.error(Language.E_FAILED_TO_READ_SPACELET_MANIFEST.p("SpaceletManager::build()"));

			application = self.find("unique_name", manifest.unique_name);					// Don't create/add existing application
			if(application) continue;

			application = new Application.obj(manifest);
			application.setDockerImageId(_applications[i].docker_image_id);

			add(application);
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

	return application;
	} );

var run = fibrous( function(application)
	{
	// Start the application in a Docker container
	try	{
		if(application.isRunning())																// Return ports if already running ([] = not running and has no ports)
			return application.getServices();

		var volumes = {};
		volumes[Config.VOLUME_PATH] = {};
		volumes[Config.API_PATH] = {};

		var binds = [Config.SPACELETS_PATH + application.getUniqueDirectory() + Config.VOLUME_DIRECTORY + ":" + Config.VOLUME_PATH + ":rw",
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
		throw Utility.error(Language.E_SPACELET_FAILED_RUN.p("SpaceletManager::run()"), err);
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

var add = function(application)
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
	var application = self.find("unique_name", unique_name);
	return (application ? application.isRunning() : false);
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

module.exports = SpaceletManager;
