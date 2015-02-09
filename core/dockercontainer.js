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
var Const = require("./constants");
var Utility = require("./utility");
var DockerHelper = require("./dockerhelper");

// Constants
var COMMAND_PORT = "2776";

// This class implements a Docker linux container that is accessible through ssh

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
var containerPorts = [];
var inspectedData = null;

var docker = new Docker({socketPath: "/var/run/docker.sock"});
var login = "root";
var password ="docker123";

var dockerHelper = new DockerHelper();

//var eventEmitter = new events.EventEmitter();

// Start a Docker container in daemon mode. The OS image must have sshd installed.
self.startContainer = fibrous( function(portCount, imageNameOrId, volumes, binds)
	{
	try	{
		for(p = 0; p<portCount; p++)													// Mapped ports are not returned in the order they are defined -> make this order array to retain the order
			{
			exposed[new String(Const.FIRST_SERVICE_PORT + p)+"/tcp"] = {};
			portOrder.push(new String(Const.FIRST_SERVICE_PORT + p)+"/tcp");
			}
		exposed["80/tcp"] = {};															// Add two additional ports for the applications internal http and https servers
		exposed["443/tcp"] = {};
		portOrder.push("80/tcp");
		portOrder.push("443/tcp");

		for(p = 0; p<portCount; p++)
			bindings[new String(Const.FIRST_SERVICE_PORT + p)+"/tcp"] = [{}];
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
		throw Utility.error(Language.E_CREATE_CONTAINER_FAILED.p("DockerContainer::createContainer()"), err); }

	try {
		dockerHelper.sync.init(container); }
	catch(err) {
		throw Utility.error(Language.E_INIT_CONTAINER_FAILED.p("DockerContainer::createContainer()"), err); }

	try	{
		container.sync.start({"PublishAllPorts": true, "PortBindings": bindings, "Binds": (binds ? binds : [])}); }
	catch(err) {
		throw Utility.error(Language.E_START_CONTAINER_FAILED.p("DockerContainer::startContainer()"), err); }

	try	{
		inspectedData = container.sync.inspect(); }
	catch(err) {
		throw Utility.error(Language.E_CONTAINER_INSPECT_FAILED.p("DockerContainer::startContainer()"), err); }
	containerId = inspectedData.ID;
	containerIp = inspectedData.NetworkSettings.IPAddress;
	logger.info("containerId: " + containerId, "containerIp: " + containerIp);

	for(i in portOrder)
		{
		var port = portOrder[i];
		containerPorts.push(inspectedData.NetworkSettings.Ports[port][0].HostPort);
		logger.info("HostPort " + port + " = " + inspectedData.NetworkSettings.Ports[port][0].HostPort);
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
		Utility.ferror(Language.E_STOPPING_CONTAINER_FAILED.p("DockerContainer::stopContainer()"), {":err": err.toString()});
		}
	});

self.installApplication = fibrous( function(appobj)
	{
	var ics = "";																		// Execute user defined commands inside the container
	var icommands = appobj.getInstallCommands();
	for(var i=0; i<icommands.length; i++)
		ics += " && " + icommands[i];

	dockerHelper.sync.executeCommand("export NODE_PATH=/usr/lib/node_modules" + ics + " && echo icfinished", "icfinished");

	return container.sync.commit({"repo": appobj.getUniqueName()});						// Create a new image (difference) for each application by committing the currently running container
	});

self.runApplication = fibrous( function(appobj)
	{
	dockerHelper.sync.executeCommand("/usr/sbin/sshd -D & echo spaceifyend", "spaceifyend");

	var crt = Config.APPLICATION_PATH + Config.WWW_DIRECTORY + Const.SPACEIFY_CRT;
	dockerHelper.sync.executeCommand("ln -s " + crt + " /etc/ssl/certs/`openssl x509 -hash -noout -in " + crt + "`.0" +
									 " && export NODE_PATH=/usr/lib/node_modules" +
									 " && cd " + Config.APPLICATION_PATH +
									 " && " + appobj.getStartCommand() + " &", Const.CLIENT_READY);
	});

self.sendClientReadyToStdIn = function()
	{
	dockerHelper.executeCommand("echo " + Const.CLIENT_READY, "*");
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
