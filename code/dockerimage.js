/**
 * DockerImage, 15.4.2014, Spaceify Inc.
 * 
 * @class DockerImage
 */

var fibrous = require("fibrous");
var Docker = require("dockerode");
var logger = require("./logger");
var Utility = require("./utility");
var Language = require("./language");

function DockerImage()
{
var self = this;

var docker = new Docker({socketPath: "/var/run/docker.sock"});

self.stopContainers = fibrous( function(imageId, imageName)
	{
	try {
		var imageId = imageId.substr(0, 12);									// Id is always the short 12 character version

		containers = docker.sync.listContainers({"all": 1});
		containers.forEach(function(containerInfo)
			{
			containerInfo.Image = containerInfo.Image.split(":")[0];			// containerInfo.Image can be either <name:tag> or <id>!? Check which it is.
			if(containerInfo.Image == imageId || containerInfo.Image == imageName)
				{
				logger.info(Utility.replace(Language.STOP_CONTAINER, {":container": containerInfo.Image}));

				var container = docker.getContainer(containerInfo.Id);
				container.sync.stop({"t": "0"});
				}
			});
		}
	catch(err)
		{
		Utility.ferror(Language.E_GENERAL_ERROR.p("DockerImage::stopContainers()"), {":err": err.toString()});
		}
	});

self.removeContainers = fibrous( function(imageId, imageName, streams)
	{
	try {
		self.sync.stopContainers(imageId, imageName);

		var imageId = imageId.substr(0, 12);									// Id is always the short 12 character version

		containers = docker.sync.listContainers({"all": 1, "size": 1});
		containers.forEach(function(containerInfo)
			{
			containerInfo.Image = containerInfo.Image.split(":")[0];			// containerInfo.Image can be either <name:tag> or <id>!? Check which it is.
			if(containerInfo.Image == imageId || containerInfo.Image == imageName)
				{
				Utility.replace(Language.REMOVE_CONTAINER, {":container": containerInfo.Image});

				var container = docker.getContainer(containerInfo.Id);
				container.sync.remove(/*{"force": "1"}*/);
				}
			});

		if(streams)
			streams.in.end();
		}
	catch(err)
		{
		Utility.ferror(Language.E_GENERAL_ERROR.p("DockerImage::removeContainers()"), {":err": err.toString()});
		}
	});

self.removeImage = fibrous( function(imageId, imageName)
	{
	try {
		if(!self.sync.inspect(imageName))											// Image must exist
			return false;

		self.sync.removeContainers(imageId, imageName, null);

		var img = docker.getImage(imageId);
		img.sync.remove();
		}
	catch(err)
		{
		Utility.ferror(Language.E_GENERAL_ERROR.p("DockerImage::removeImage()"), {":err": err.toString()});
		}
	});

self.inspect = fibrous( function(image)
	{
	var info = null;

	try {
		var img = docker.getImage(image);
		var info = img.sync.inspect();
		}
	catch(err)
		{}

	return (info ? info : null);
	});

}

module.exports = DockerImage;
