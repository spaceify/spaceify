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
			var fspacelet = self.find("unique_name", unique_name);						// Spacelet by this unique name alredy exists?

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
	spacelet = self.find("unique_name", unique_name);
	if(spacelet)
		{
		self.sync.stop(spacelet);
		if(remove)
			delete spacelet;
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
	var spacelet = self.find("unique_name", unique_name);
	return (spacelet ? spacelet.isRunning() : false);
	}

self.initialized = function(spacelet, success)
	{
	spacelet.setInitialized(success);

	if((dc = spacelet.getDockerContainer()) != null)
		dc.sendClientReadyToStdIn();
	}

self.find = function(_param, _find)
	{ // Find based on _param and _find object
	unique_name = _param.toLowerCase();

	for(i in spacelets)
		{
		var unique_name = spacelets[i].getUniqueName();

		if(_param == "path" && _find == unique_name)
			return spacelets[i].getInstallationPath();
		else if(_param == "unique_name" && _find == unique_name)
			return spacelets[i];
		else if(_param == "services" && _find == unique_name)
			return spacelets[i].getServiceMappings();
		else if(_param == "service")
			{
			var service = spacelets[i].getService(_find.service_name);
			if(service != null || (service != null && service.ip == _find.ip && (_find.service_name == Const.CLIENT_HTTP_SERVER || _find.service_name == Const.CLIENT_HTTPS_SERVER)))	// Application can find its own http(s) services
				return service;
			}
		else if(_param == "remote_address")
			{
			var dc = spacelets[i].getDockerContainer();
			if(dc != null && dc.getIpAddress() == _find)
				return spacelets[i];
			}
		else if(_param == "streams")
			{
			var dc = spacelets[i].getDockerContainer();
			if(dc != null && dc.getContainerId() == _find)
				return dc.getStreams();
			}
		}

	return null;
	}

}

module.exports = SpaceletManager;
