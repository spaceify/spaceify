/**
* DockerHelper, 14.10.2013
*
* @class DockerHelper
*/

var fs = require("fs");
var net = require("net");
var logger = require("./www/libs/logger");
var utility = require("./utility");
var language = require("./language");

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
				throw utility.ferror(language.E_ATTACH_CONTAINER_OUTPUT.p("DockerHelper::init"), {":err": err.toString()});

			standardOutput = stream;

			container.attach({stream: true, stdin: true}, function(err, stream)
				{
				if(err)
					throw utility.ferror(language.E_ATTACH_CONTAINER_INPUT.p("DockerHelper::init"), {":err": err.toString()});

				standardInput = stream;
				callback(err, null);
				});
			});
		}
	catch(err)
		{
		callback(utility.error(err), null);
		}
	}

self.getStreams = function()
	{
	return {in: standardInput, out: standardOutput };
	}

self.executeCommand = function(command, waitedStrings, disableInfo, callback)
	{
	if(!disableInfo)
		logger.info(utility.replace(language.EXECUTE_COMMAND, {":command": command}));

	if(callback)															// only wait for data if callback is given                        
		self.waitForOutput(waitedStrings, callback);

	var write = standardInput.write(command + "\n", "utf8", function(err, data)
		{
		if(err)
			utility.ferror(language.E_GENERAL_ERROR.p("DockerHelper::executeCommand"), {":err": err.toString()});
		});
	}

self.waitForOutput = function(waitedStrings, callback)
	{
	var buf = "";
	standardOutput.removeAllListeners("data");
	standardOutput.on("data", function(data)
		{
		if(!waitedStrings)
			callback(null, "");

		// <Buffer 01 00 00 00 00 00 00 xx ...> What is this 8 byte sequence? Always ends with 0a (f.ex. from console.log).
		tdata = data.toString("ascii", 8, data.length - (data.length > 8 ? 1 : 0));

		logger.info(tdata);

		buf += tdata;
		for(var i=0; i<waitedStrings.length; i++)
			{
			if(buf.lastIndexOf(waitedStrings[i]) != -1 || (buf.length > 0 && waitedStrings[i] == "*"))
				{
				logger.info(utility.replace(language.EXECUTE_COMMAND_RECEIVED, {":code": waitedStrings[i]}), "\n");

				standardOutput.removeAllListeners("data");
				callback(null, [buf, waitedStrings[i]]);
				}
			}
		});
	}

}

module.exports = DockerHelper;
