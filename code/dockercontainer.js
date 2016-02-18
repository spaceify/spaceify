/**
 * DockerContainer, 2013, Spaceify Inc.
 * 
 * @class DockerContainer
 */

//Includes

var events = require("events");
var fibrous = require("fibrous");
var Docker = require("dockerode");
var logger = require("./www/libs/logger");
var language = require("./language");
var config = require("./config")();
var utility = require("./utility");
var DockerHelper = require("./dockerhelper");

function DockerContainer()
{
var self = this;

//var PortSpecs = [];
var exposed = {};
var bindings = {};
var portOrder = [];
var container = null;
var containerId = null;
var containerIp = null;
var envPorts = "";
var containerPorts = [];
var inspectedData = null;

var login = "root";
var password ="docker123";
var docker = new Docker({socketPath: "/var/run/docker.sock"});

var dockerHelper = new DockerHelper();

// Start a Docker container in daemon mode. The OS image must have sshd installed.
self.startContainer = fibrous( function(portCount, imageNameOrId, volumes, binds)
	{
	try	{
		/*var version = docker.sync.version();
		console.log(version);*/

		for(p=0; p<portCount; p++)													// Mapped ports are not returned in the order they are defined -> make order array to restore the order
			{
			exposed[new String(config.FIRST_SERVICE_PORT + p)+"/tcp"] = {};
			portOrder.push(new String(config.FIRST_SERVICE_PORT + p)+"/tcp");
			}
		for(p=0; p<portCount; p++)
			{
			exposed[new String(config.FIRST_SERVICE_PORT_SECURE + p)+"/tcp"] = {};
			portOrder.push(new String(config.FIRST_SERVICE_PORT_SECURE + p)+"/tcp");
			}
		exposed["80/tcp"] = {};														// Add two additional ports for the applications internal http and https servers
		exposed["443/tcp"] = {};
		portOrder.push("80/tcp");
		portOrder.push("443/tcp");

		for(p = 0; p<portCount; p++)
			bindings[new String(config.FIRST_SERVICE_PORT + p)+"/tcp"] = [{}];
		for(p = 0; p<portCount; p++)
			bindings[new String(config.FIRST_SERVICE_PORT_SECURE + p)+"/tcp"] = [{}];
		bindings["80/tcp"] = [{}];
		bindings["443/tcp"] = [{}];

		var opts = {
			"Hostname": "",
			"User": "",
			"AttachStdin": true,
			"AttachStdout": true,
			"AttachStderr": true,
			"Tty": false,
			"OpenStdin": true,
			"StdinOnce": false,
			"Env": null,
			//"WorkingDir": config.APPLICATION_PATH,
			//"Cmd": ["/usr/sbin/sshd", "-D"],
			"Cmd": ["/bin/bash"],
			//"Dns": ["8.8.8.8", "8.8.4.4"],
			"Dns": [config.EDGE_IP, null],
			"Image": imageNameOrId,
			"Volumes": (volumes ? volumes : {}),
			"HostConfig": {
				"VolumesFrom": null,
				"PublishAllPorts": true,
				"PortBindings": bindings,
				"Binds": (binds ? binds : [])
				},
			"ExposedPorts": exposed
			//"PortSpecs": PortSpecs
      	};
		container = docker.sync.createContainer(opts);
		}
	catch(err) {
		throw utility.error(language.E_CREATE_CONTAINER_FAILED.p("DockerContainer::createContainer"), err); }

	try {
		dockerHelper.sync.init(container); }
	catch(err) {
		throw utility.error(language.E_INIT_CONTAINER_FAILED.p("DockerContainer::createContainer"), err); }

	try	{
		container.sync.start(); }
	catch(err) {
		throw utility.error(language.E_START_CONTAINER_FAILED.p("DockerContainer::startContainer"), err); }

	try	{
		inspectedData = container.sync.inspect(); }
	catch(err) {
		throw utility.error(language.E_CONTAINER_INSPECT_FAILED.p("DockerContainer::startContainer"), err); }
	containerId = (inspectedData.ID ? inspectedData.ID : inspectedData.Id);
	containerIp = inspectedData.NetworkSettings.IPAddress;
	logger.info("containerId: " + containerId + ", containerIp: " + containerIp);

	for(i in portOrder)																// Store the mapped ports in the order they were exposed
		{
		var port = portOrder[i];
		var hostPort = inspectedData.NetworkSettings.Ports[port][0].HostPort;

		containerPorts.push(hostPort);
		logger.info("HostPort " + port + " = " + hostPort);

		//envPorts += " && export PORT_" + port.replace(/[^0-9]/g, "") + "=" + hostPort;
		envPorts += "export PORT_" + port.replace(/[^0-9]/g, "") + "=" + hostPort + "\n";
		}

	});

self.stopContainer = fibrous( function(appobj)
	{
	try	{
		if(container != null)
			{
			if(appobj.getStopCommand() != "")
				dockerHelper.sync.executeCommand("cd " + config.APPLICATION_PATH + " && " + appobj.getStopCommand() + " && echo stopcontainer", ["stopcontainer"], false);

			container.sync.stop({"t": "0"});
			container.sync.wait();
			container.sync.remove({"force": true});
			}
		}
	catch(err)
		{
		utility.ferror(language.E_STOPPING_CONTAINER_FAILED.p("DockerContainer::stopContainer"), {":err": err.toString()});
		}
	});

self.installApplication = fibrous( function(appobj)
	{
	var ics = "";																		// Execute user defined commands inside the Docker container
	var icommands = appobj.getInstallCommands();
	for(var i=0; i<icommands.length; i++)
		ics += " && " + icommands[i];

	dockerHelper.sync.executeCommand("export NODE_PATH=" + config.API_NODE_MODULES_DIRECTORY + ics + " && echo icfinished", ["icfinished"], false);

	// Create a new image (difference) for each application by committing the currently running container
	return container.sync.commit({"repo": appobj.getUniqueName(), "container": self.getContainerId()});
	});

self.runApplication = fibrous( function(appobj)
	{
	dockerHelper.sync.executeCommand("/usr/sbin/sshd -D & echo spaceifyend", ["spaceifyend"], false);

	var bash = 	  "cd " + config.APPLICATION_PATH + "\n"
				+ "printf \""
				+ "#!/bin/bash" + "\n"
				+ "export NODE_PATH=" + config.API_NODE_MODULES_DIRECTORY + "\n"
				+ "export APPLICATION_INITIALIZED=" + config.APPLICATION_INITIALIZED + "\n"
				+ "export APPLICATION_UNINITIALIZED=" + config.APPLICATION_UNINITIALIZED + "\n"
				+  envPorts + "\n"
				+  appobj.getStartCommand() + "\n"
				+ "ec=\\\$?" + "\n"
				+ "if (( \\\$ec != 0 )); then" + "\n"
				+ "    printf ';;Starting the application failed with return code '" + "\\\$ec::" + "\n"
				+ "    printf '" + config.APPLICATION_UNINITIALIZED + "'\n" + "\n"
				+ "fi" + "\n"
				+ "kill -9 \\\$\\\$" + "\n"
				+ "\" > /tmp/run.sh && bash /tmp/run.sh \n";

	var response = dockerHelper.sync.executeCommand(bash, [config.APPLICATION_INITIALIZED, config.APPLICATION_UNINITIALIZED], true);

	/*var response = dockerHelper.sync.executeCommand(
									"export NODE_PATH=" + config.API_NODE_MODULES_DIRECTORY
									+ " && export APPLICATION_INITIALIZED=" + config.APPLICATION_INITIALIZED
									+ " && export APPLICATION_UNINITIALIZED=" + config.APPLICATION_UNINITIALIZED
									+ envPorts
									+ " && cd " + config.APPLICATION_PATH
									+ " && " + appobj.getStartCommand() + " &", [config.APPLICATION_INITIALIZED, config.APPLICATION_UNINITIALIZED], true);*/

	return response;
	});

self.getIpAddress = function()
	{
	return containerIp;
	}

self.getPublicPorts = function()
	{
	return containerPorts;
	}

self.getContainerId = function()
	{
	return containerId;
	}

self.getStreams = function()
	{
	return dockerHelper.getStreams();
	}

}

module.exports = DockerContainer;
