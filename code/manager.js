/**
 * Manager, 22.10.2015 Spaceify Inc.
 *
 * Used to gather common methods in spacelet, sandboxed application and native application managers to one subclass.
 *
 * @class Manager
 */

var fibrous = require("fibrous");
var config = require("./config")();
var utility = require("./utility");
var language = require("./language");
var Application = require("./application");
var DockerContainer = require("./dockercontainer");

function Manager(parent)
{
parent.build = fibrous( function(docker_image_id, unique_directory, unique_name, type)
	{
	var application = null;
	var application_path = (type == config.SANDBOXED ? config.SANDBOXED_PATH : config.SPACELETS_PATH);

	if((manifest = utility.sync.loadJSON(application_path + unique_directory + config.VOLUME_DIRECTORY + config.APPLICATION_DIRECTORY + config.MANIFEST, true)) == null)
		throw utility.ferror(language.E_MANAGER_FAILED_TO_READ_MANIFEST.p("Manager::build"), {":type": language.APPLICATION_DISPLAY_NAMES[type], ":unique_name": unique_name});

	application = new Application.obj(manifest);
	application.setDockerImageId(docker_image_id);
	parent.add(application);

	return application;
	});

parent.run = fibrous( function(application)
	{
	// Start the application in a Docker container
	try {
		if(application.isRunning())
			return true;

		var application_path = (application.getType() == config.SANDBOXED ? config.SANDBOXED_PATH : config.SPACELETS_PATH);

		var volumes = {};
		volumes[config.VOLUME_PATH] = {};
		volumes[config.API_PATH] = {};

		var binds = [application_path + application.getUniqueDirectory() + config.VOLUME_DIRECTORY + ":" + config.VOLUME_PATH + ":rw",
					 config.SPACEIFY_CODE_PATH + ":" + config.API_PATH + ":ro"];

		var dockerContainer = new DockerContainer();
		application.setDockerContainer(dockerContainer);
		dockerContainer.sync.startContainer(application.getProvidesServicesCount(), application.getDockerImageId(), volumes, binds);

		application.makeServices(dockerContainer.getPublicPorts(), dockerContainer.getIpAddress());

		var response = dockerContainer.sync.runApplication(application);		// [0] = output from the app, [1] = initialization status
		if(response[1] == config.APPLICATION_UNINITIALIZED)
			{
			var matches = /;;(.+)::/.exec(response[0]);							// extract error string from the output
			application.setInitialized(false, matches[1]);
			}
		else
			application.setInitialized(true, "");

		application.setRunning(application.isInitialized());
		}
	catch(err)
		{
		var ferr = utility.ferror(language.E_MANAGER_FAILED_TO_RUN.p("Manager::run"), {":type": language.APPLICATION_DISPLAY_NAMES[application.getType()], ":unique_name": application.getUniqueName()});
		throw utility.error(ferr, err);
		}
	});

parent.stop = fibrous( function(application)
	{
	if(typeof application == "string")
		application = parent.find("application", application);

	if(application)
		{
		if((dockerContainer = application.getDockerContainer()) != null)
			dockerContainer.sync.stopContainer(application);

		application.setRunning(false);
		}
	});

parent.add = function(application)
	{
	application.setOrdinal(++parent.ordinal);
	parent.applications[parent.ordinal] = application;
	}

parent.remove = fibrous( function(application)
	{
	if(typeof application == "string")
		application = parent.find("application", application);

	for(i in parent.applications)
		{
		if(application.getOrdinal() == parent.applications[i].getOrdinal())
			{
			parent.sync.stop(parent.applications[i]);
			delete parent.applications[i];
			break;
			}
		}
	});

parent.removeAll = fibrous( function()
	{
	for(i in parent.applications)
		parent.sync.remove(parent.applications[i]);
	});

parent.isRunning = function(unique_name)
	{
	var application = parent.find("application", unique_name);
	return (application ? application.isRunning() : false);
	}

parent.find = function(_param, _find)
	{ // Find is based on _param and _find object
	return Application.inst.find(parent.applications, _param, _find);
	}

}

module.exports = Manager;
