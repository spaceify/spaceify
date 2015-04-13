/**
 * DockerContainer, 2013, Spaceify Inc.
 * 
 * @class DockerContainer
 */

//Includes

var events = require("events");
var fibrous = require("fibrous");
var Docker = require("dockerode");
var logger = require("./logger");
var Language = require("./language");
var Config = require("./config")();
var Utility = require("./utility");
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
		for(p=0; p<portCount; p++)													// Mapped ports are not returned in the order they are defined -> make this order array to retain the order
			{
			exposed[new String(Config.FIRST_SERVICE_PORT + p)+"/tcp"] = {};
			portOrder.push(new String(Config.FIRST_SERVICE_PORT + p)+"/tcp");
			}
		for(p=0; p<portCount; p++)
			{
			exposed[new String(Config.FIRST_SERVICE_PORT_SECURE + p)+"/tcp"] = {};
			portOrder.push(new String(Config.FIRST_SERVICE_PORT_SECURE + p)+"/tcp");
			}
		exposed["80/tcp"] = {};														// Add two additional ports for the applications internal http and https servers
		exposed["443/tcp"] = {};
		portOrder.push("80/tcp");
		portOrder.push("443/tcp");

		for(p = 0; p<portCount; p++)
			bindings[new String(Config.FIRST_SERVICE_PORT + p)+"/tcp"] = [{}];
		for(p = 0; p<portCount; p++)
			bindings[new String(Config.FIRST_SERVICE_PORT_SECURE + p)+"/tcp"] = [{}];
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
			//"Cmd": ["/usr/sbin/sshd", "-D"],
			"Cmd": ["/bin/bash"],
			//"Dns": ["8.8.8.8", "8.8.4.4"],
			"Dns": [Config.EDGE_IP, null],
			"Image": imageNameOrId,
			"Volumes": (volumes ? volumes : {}),
			"VolumesFrom": "",
			"ExposedPorts": exposed
			//"PortSpecs": PortSpecs
      	};
		container = docker.sync.createContainer(opts);
		}
	catch(err) {
		throw Utility.error(Language.E_CREATE_CONTAINER_FAILED.p("DockerContainer::createContainer"), err); }

	try {
		dockerHelper.sync.init(container); }
	catch(err) {
		throw Utility.error(Language.E_INIT_CONTAINER_FAILED.p("DockerContainer::createContainer"), err); }

	try	{
		container.sync.start({"PublishAllPorts": true, "PortBindings": bindings, "Binds": (binds ? binds : [])}); }
	catch(err) {
		throw Utility.error(Language.E_START_CONTAINER_FAILED.p("DockerContainer::startContainer"), err); }

	try	{
		inspectedData = container.sync.inspect(); }
	catch(err) {
		throw Utility.error(Language.E_CONTAINER_INSPECT_FAILED.p("DockerContainer::startContainer"), err); }
	containerId = inspectedData.ID;
	containerIp = inspectedData.NetworkSettings.IPAddress;
	logger.info("containerId: " + containerId + ", containerIp: " + containerIp);

	for(i in portOrder)
		{
		var port = portOrder[i];
		var hostPort = inspectedData.NetworkSettings.Ports[port][0].HostPort;

		containerPorts.push(hostPort);
		logger.info("HostPort " + port + " = " + hostPort);

		envPorts += " && export PORT_" + port.replace(/[^0-9]/g, "") + "=" + hostPort;
		}

	});

self.stopContainer = fibrous( function(appobj)
	{
	try	{
		if(container != null)
			{
			if(appobj.getStopCommand() != "")
				dockerHelper.sync.executeCommand("cd " + Config.APPLICATION_PATH + " && " + appobj.getStopCommand() + " && echo stopcontainer", "stopcontainer");

			container.sync.stop({"t": "0"});
			container.sync.remove();
			}
		}
	catch(err)
		{
		Utility.ferror(Language.E_STOPPING_CONTAINER_FAILED.p("DockerContainer::stopContainer"), {":err": err.toString()});
		}
	});

self.installApplication = fibrous( function(appobj)
	{
	var ics = "";																		// Execute user defined commands inside the Docker container
	var icommands = appobj.getInstallCommands();
	for(var i=0; i<icommands.length; i++)
		ics += " && " + icommands[i];

	dockerHelper.sync.executeCommand("export NODE_PATH=" + Config.API_NODE_MODULES_DIRECTORY + ics + " && echo icfinished", "icfinished");
	return container.sync.commit({"repo": appobj.getUniqueName()});						// Create a new image (difference) for each application by committing the currently running container
	});

self.runApplication = fibrous( function(appobj)
	{
	dockerHelper.sync.executeCommand("/usr/sbin/sshd -D & echo spaceifyend", "spaceifyend");

	dockerHelper.sync.executeCommand("export NODE_PATH=" + Config.API_NODE_MODULES_DIRECTORY +
									 envPorts + 
									 " && cd " + Config.APPLICATION_PATH +
									 " && " + appobj.getStartCommand() + " &", Config.CLIENT_READY);
	});

self.sendClientReadyToStdIn = function()
	{
	dockerHelper.executeCommand("echo " + Config.CLIENT_READY, "*");
	}

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
