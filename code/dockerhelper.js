"use strict";

/**
* DockerHelper, 14.10.2013 Spaceify Oy
*
* @class DockerHelper
*/

var fs = require("fs");
var net = require("net");
var language = require("./language");
var Logger = require("./logger");
var SpaceifyError = require("./spaceifyerror");
var SpaceifyUtility = require("./spaceifyutility");

function DockerHelper()
{
var self = this;

var logger = new Logger();
var errorc = new SpaceifyError();
var utility = new SpaceifyUtility();

var standardInput = null;
var standardOutput = null;

self.init = function(container, callback)
	{
	try {
		container.attach({stream: true, stdout: true, stderr: true}, function(err, stream)
			{
			if(err)
				throw language.E_INIT_ATTACH_CONTAINER_OUTPUT_FAILED.preFmt("DockerHelper::init", {"~err": err.toString()});

			standardOutput = stream;

			container.attach({stream: true, stdin: true}, function(err, stream)
				{
				if(err)
					throw language.E_INIT_ATTACH_CONTAINER_INPUT_FAILED.preFmt("DockerHelper::init", {"~err": err.toString()});

				standardInput = stream;
				callback(err, null);
				});
			});
		}
	catch(err)
		{
		callback(errorc.make(err), null);
		}
	}

self.getStreams = function()
	{
	return {in: standardInput, out: standardOutput };
	}

self.executeCommand = function(command, waitedStrings, disableInfo, callback)
	{
	if(!disableInfo)
		logger.info(utility.replace(language.EXECUTE_COMMAND, {"~command": command}));

	if(callback)															// only wait for data if callback is given
		self.waitForOutput(waitedStrings, callback);

	var write = standardInput.write(command + "\n", "utf8", function(err, data)
		{
		if(err)
			language.E_GENERAL_ERROR.preFmt("DockerHelper::executeCommand", {"~err": err.toString()});
		});
	}

self.waitForOutput = function(waitedStrings, callback)
	{
	var seq;
	var tdata;
	var buf = "";

	standardOutput.removeAllListeners("data");
	standardOutput.on("data", function(data)
		{
		if(!waitedStrings)
			callback(null, "");

		// <Buffer 01 00 00 00 00 00 00 ?? ...> What is this 8 byte sequence/preamble?
		tdata = data.toString("ascii");
		seq = (data.length >= 8 ? data.readInt32BE(0) : 0);
		if(seq == 16777216)
			tdata = tdata.substr(tdata.length > 8 ? 8 : 0, data.length - 1);

		logger.info(tdata);

		buf += tdata;
		for(var i = 0; i < waitedStrings.length; i++)
			{
			if(buf.lastIndexOf(waitedStrings[i]) != -1 || (buf.length > 0 && waitedStrings[i] == "*"))
				{
				logger.info(utility.replace(language.EXECUTE_COMMAND_RECEIVED, {"~code": waitedStrings[i]}), "\n");

				standardOutput.removeAllListeners("data");
				callback(null, [buf, waitedStrings[i]]);
				}
			}
		});
	}

}

module.exports = DockerHelper;
