/**
 * Spacelet Manager, 2013 Spaceify Inc.
 * SpaceletManager is a class for managing Spacelets and their processes. It launches spacelet processes, manages their quotas and access rights and terminates them when needed.
 *
 * @class SpaceletManager
 */

var fs = require("fs");
var fibrous = require("fibrous");
var Config = require("./config")();
var Const = require("./constants");
var Utility = require("./utility");
var Language = require("./language");
var Spacelet = require("./spacelet");
var Database = require("./database");
var DockerContainer = require("./dockercontainer");

function SpaceletManager()
{
var self = this;

var spacelets = Object();
var ordinal = 0;

var database = new Database();

var isStarting = false;
var delayedStart = [];

self.start = function(unique_name, callback)
	{
	var spacelet = null;

	if(isStarting)																	// Start one spacelet at a time - retain call order
		delayedStart.push({"unique_name": unique_name, "callback": callback});
	else
		{
		isStarting = true;

		try {
			var fspacelet = findByUniqueName(unique_name);								// Spacelet by this unique name alredy exists?

			/*
			// SHARE SPACELET OR START A NEW
			if(!fspacelet || (fspacelet && !fspacelet.isShared()))						// 'No' OR 'yes and is not shared' -> add the build spacelet to the spacelets object
				{
				spacelet = build.sync(unique_name);
				add(spacelet);
				}
			else if(fspacelet && fspacelet.isShared())									// 'Yes and is shared' -> use the existing spacelet
				spacelet = fspacelet;
			*/

			// SPACELETS ARE NOW SHARED BY DEFAULT - CREATE IF SPACELET DOESN'T EXIST
			if(!fspacelet)
				{
				spacelet = build.sync(unique_name);
				add(spacelet);
				}
			else
				spacelet = fspacelet;

			// START SPACELET
			run.sync(spacelet);

			if(!spacelet.isInitialized())
				throw Utility.error(false, Language.E_SPACELET_FAILED_INIT_ITSELF.p("SpaceletManager::start()"));

			callback(null, spacelet);
			}
		catch(err)
			{
			remove(spacelet);															// do some cleanup

			callback(Utility.error(false, err), null);
			}

		isStarting = false;

		if(delayedStart.length != 0)													// Start next spacelet?
			{
			var sp = delayedStart.splice(0, 1);
			self.start(sp[0].unique_name, sp[0].callback);
			}
		}
	}

var build = fibrous(function(unique_name)
	{
	var spacelet = null;

	try {
		database.open(Config.SPACEIFY_DATABASE_FILEPATH);

		if(!(application = database.sync.getApplication([unique_name])) )
			throw Utility.error(false, Language.E_FAILED_TO_READ_SPACELET_INFO.p("SpaceletManager::build()"));

		if((manifest = Utility.sync.loadManifest(Config.SPACELETS_PATH + application.unique_directory + Config.VOLUME_DIRECTORY + Config.APPLICATION_DIRECTORY + Const.MANIFEST, true)) == null)
			throw Utility.error(false, Language.E_FAILED_TO_READ_SPACELET_MANIFEST.p("SpaceletManager::build()"));

		var spacelet = new Spacelet(manifest);
		spacelet.setDockerImageId(application.docker_image_id);

		// ToDo: Check manifest rights - are the services provided and required (manifest.requires_services[N].unique_name + manifest.requires_services[N].service_name accepted) in the accepted list for this host and/or spacelet
		}
	catch(err)
		{
		throw Utility.error(false, err);
		}
	finally
		{
		database.close();
		}

	return spacelet;
	} );

var run = fibrous(function(spacelet)
	{
	// Return ports if already running ([] = not running and has no ports)
	if(spacelet.isRunning())
		return spacelet.getServiceMappings();

	// Start the spacelet in a Docker container
	try	{
		var volumes = {};
		volumes[Config.VOLUME_PATH] = {};
		var binds = [Config.SPACELETS_PATH + spacelet.getUniqueDirectory() + Config.VOLUME_DIRECTORY + ":" + Config.VOLUME_PATH + ":rw"];
		var dockerContainer = new DockerContainer();
		spacelet.setDockerContainer(dockerContainer);
		dockerContainer.sync.startContainer(spacelet.getProvidesServicesCount(), spacelet.getDockerImageId(), volumes, binds);

		spacelet.makeServiceMappings(dockerContainer.getPublicPorts(), dockerContainer.getIpAddress())

		dockerContainer.sync.runApplication(spacelet);

		spacelet.setRunning(true);

		return spacelet.getServiceMappings();
		}
	catch(err)
		{
		throw Utility.error(false, err);
		}
	});

self.stop = fibrous(function(spacelet)
	{
	if((dockerContainer = spacelet.getDockerContainer()) != null)
		dockerContainer.sync.stopContainer(spacelet);

	spacelet.setRunning(false);
	});

self.stopAll = fibrous(function(remove)
	{
	for(i in spacelets)
		{
		self.sync.stop(spacelets[i]);

		if(remove)
			delete spacelets[i];
		}
	});

self.stopByUniqueName = fibrous(function(unique_name, remove)
	{
	for(i in spacelets)
		{
		if(spacelets[i].getUniqueName() == unique_name)
			{
			self.sync.stop(spacelets[i]);

			if(remove)
				delete spacelets[i];
			}
		}
	});

var add = function(spacelet)
	{
	var newOrdinal = ++ordinal;
	spacelet.setOrdinal(newOrdinal);
	spacelets[newOrdinal] = spacelet;
	}

var remove = function(spacelet)
	{
	if(!spacelet)
		return;

	for(i in spacelets)
		{
		if(spacelet.getOrdinal() == spacelets[i].getOrdinal())
			{
			self.sync.stop(spacelets[i]);
			delete spacelets[i];
			break;
			}
		}
	}

self.isRunning = function(unique_name)
	{
	var spacelet = findByUniqueName(unique_name);
	return (spacelet ? spacelet.isRunning() : false);
	}

self.findByRemoteAddress = function(ip)
	{
	for(i in spacelets)
		{
		var dc = spacelets[i].getDockerContainer();

		if(dc != null && dc.getIpAddress() == ip)
			return spacelets[i];
		}

	return null;
	}

self.findService = function(service_name, ip)
	{
	for(i in spacelets)
		{
		var service = spacelets[i].getService(service_name);

		if(service != null && service.ip == ip && (service_name == Const.CLIENT_HTTP_SERVER || service_name == Const.CLIENT_HTTPS_SERVER))	// Application can find its own http(s) services
			return service;		
		else if(service != null)
			return service;
		}

	return null;
	}

self.getByUniqueName = function(unique_name, parameter)
	{ // Get requested parameter of a spacelet identified by unique_name
	unique_name = unique_name.toLowerCase();

	for(i in spacelets)
		{
		if(spacelets[i].getUniqueName() == unique_name)
			{
			if(parameter == "services")
				return spacelets[i].getServiceMappings();
			else if(parameter == "path")
				return spacelets[i].getInstallationPath();
			}
		}

	return null;
	}

var findByUniqueName = function(unique_name)
	{
	for(i in spacelets)
		{
		if(spacelets[i].getUniqueName() == unique_name)
			return spacelets[i];
		}

	return null;
	}

self.initialized = function(spacelet, success)
	{
	spacelet.setInitialized(success);

	if((dc = spacelet.getDockerContainer()) != null)
		dc.sendClientReadyToStdIn();
	}

}

module.exports = SpaceletManager;
