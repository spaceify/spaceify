"use strict";

/**
 * DockerImage, 15.4.2014 Spaceify Oy
 * 
 * @class DockerImage
 */

var fibrous = require("fibrous");
var Docker = require("dockerode");
var Logger = require("./logger");
var language = require("./language");
var SpaceifyUtility = require("./spaceifyutility");

function DockerImage()
{
var self = this;

var logger = new Logger();
var utility = new SpaceifyUtility();

var docker = new Docker({socketPath: "/var/run/docker.sock"});

self.stopContainers = fibrous( function(imageId, imageName)
	{
	var imageId;
	var container;

	try {
		imageId = imageId.substr(0, 12);										// Id is always the short 12 character version

		containers = docker.sync.listContainers({"all": 1});
		containers.forEach(function(containerInfo)
			{
			containerInfo.Image = containerInfo.Image.split(":")[0];			// containerInfo.Image can be either <name:tag> or <id>!? Check which it is.
			if(containerInfo.Image == imageId || containerInfo.Image == imageName)
				{
				logger.info(utility.replace(language.STOP_CONTAINER, {"~container": containerInfo.Image}));

				container = docker.getContainer(containerInfo.Id);
				container.sync.stop({"t": "0"});
				}
			});
		}
	catch(err)
		{
		language.E_GENERAL_ERROR.preFmt("DockerImage::stopContainers", {"~err": err.toString()});
		}
	});

self.removeContainers = fibrous( function(imageId, imageName, streams)
	{
	var imageId;
	var container;

	try {
		self.sync.stopContainers(imageId, imageName);

		imageId = imageId.substr(0, 12);										// Id is always the short 12 character version

		containers = docker.sync.listContainers({"all": 1, "size": 1});
		containers.forEach(function(containerInfo)
			{
			containerInfo.Image = containerInfo.Image.split(":")[0];			// containerInfo.Image can be either <name:tag> or <id>!? Check which it is.
			if(containerInfo.Image == imageId || containerInfo.Image == imageName)
				{
				utility.replace(language.REMOVE_CONTAINER, {"~container": containerInfo.Image});

				container = docker.getContainer(containerInfo.Id);
				container.sync.remove({"f": true});
				}
			});

		if(streams)
			streams.in.end();
		}
	catch(err)
		{
		language.E_GENERAL_ERROR.preFmt("DockerImage::removeContainers", {"~err": err.toString()});
		}
	});

self.removeImage = fibrous( function(imageId, imageName)
	{
	var img;
	
	try {
		if(!self.sync.inspect(imageName))											// Image must exist
			return false;

		self.sync.removeContainers(imageId, imageName, null);

		img = docker.getImage(imageId);
		img.sync.remove();
		}
	catch(err)
		{
		language.E_GENERAL_ERROR.preFmt("DockerImage::removeImage", {"~err": err.toString()});
		}
	});

self.inspect = fibrous( function(image)
	{
	var img;
	var info = null;

	try {
		img = docker.getImage(image);
		info = img.sync.inspect();
		}
	catch(err)
		{}

	return (info ? info : null);
	});

}

module.exports = DockerImage;
