/**
* DockerHelper, 14.10.2013
*
* @class DockerHelper
*/

var fs = require("fs");
var net = require("net");
var logger = require("./logger");
var Utility = require("./utility");
var Language = require("./language");

function DockerHelper()
{
var self = this;

var standardInput = null;
var standardOutput = null;

self.init = function(container, callback)
	{
	try {
		container.attach({stream: true, stdout: true, stderr: true}, function(err, stream)
			{
			if(err)
				throw Utility.ferror(Language.E_ATTACH_CONTAINER_OUTPUT.p("DockerHelper::init"), {":err": err.toString()});

			standardOutput = stream;
			container.attach({stream: true, stdin: true}, function(err, stream)
				{
				if(err)
					throw Utility.ferror(Language.E_ATTACH_CONTAINER_INPUT.p("DockerHelper::init"), {":err": err.toString()});

				standardInput = stream;
				callback(err, null);
				});
			});
		}
	catch(err)
		{
		callback(Utility.error(err), null);
		}
	}

self.getStreams = function()
	{
	return {in: standardInput, out: standardOutput };
	}

self.executeCommand = function(command, waitedString, callback)
	{
	logger.info(Utility.replace(Language.EXECUTE_COMMAND, {":command": command}));

	if(callback)															// only wait for data if callback is given                        
		self.waitForOutput(waitedString, callback);

	var write = standardInput.write(command + "\n", "utf8", function(err, data)
		{
		if(err)
			Utility.ferror(Language.E_GENERAL_ERROR.p("DockerHelper::executeCommand"), {":err": err.toString()});
		});
	}

self.waitForOutput = function(waitedString, callback)
	{
	var buf = "";
	standardOutput.removeAllListeners("data");
	standardOutput.on("data", function(data)
		{
		logger.info(data.toString());
		if(!waitedString)
			callback(null, buf);

		buf += data;
		if(buf.lastIndexOf(waitedString) != -1 || (buf.length > 0 && waitedString == "*"))
			{
			logger.info(Utility.replace(Language.EXECUTE_COMMAND_RECEIVED, {":code": waitedString}));
			
			standardOutput.removeAllListeners("data");
			callback(null, buf);
			}
		});
	}

}

module.exports = DockerHelper;
