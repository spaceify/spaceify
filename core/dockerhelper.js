/**
* DockerHelper, 14.10.2013
*
* @class DockerHelper
*/

var fs = require("fs");
var net = require("net");
var logger = require("./logger");
var Const = require("./constants");
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
				throw Utility.ferror(false, Language.E_ATTACH_CONTAINER_OUTPUT.p("DockerHelper::init()"), {":err": err.toString()});

			standardOutput = stream;
			container.attach({stream: true, stdin: true}, function(err, stream)
				{
				if(err)
					throw Utility.ferror(false, Language.E_ATTACH_CONTAINER_INPUT.p("DockerHelper::init()"), {":err": err.toString()});

				standardInput = stream;
				callback(err, null);
				});
			});
		}
	catch(err)
		{
		callback(Utility.error(false, Language.E_ATTACH_CONTAINER_FAILED.p("DockerHelper::init()"), err), null);
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
			Utility.ferror(true, Language.E_GENERAL_ERROR.p("DockerHelper::executeCommand()"), {":err": err.toString()});
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

self.sendFile = function(containerIp, commandPort, sourcePath, destPath, fileName, callback)
	{
	// start netcat waiting for a single file
	self.executeCommand("nc -n -v -l -p " + commandPort + " > " + destPath + fileName + " && echo ncfinished", "*", function()
		{
		logger.info(Utility.replace(Language.NETCAT_CONNECT, {":ip": containerIp, ":port": commandPort}));

		var socket = new net.Socket();

		socket.on("error", function(err)
			{
			callback(Utility.error(false, Language.E_SEND_FILE_CONNECT_FAILED.p("DockerHelper::sendFile()"), err), null);
			} );
		
		socket.connect(commandPort, containerIp, function()
			{
			logger.info(Language.NETCAT_CONNECTED);

			var stream = fs.createReadStream(sourcePath + fileName);

			stream.on("error", function(err)
				{
				callback(Utility.error(false, Language.E_SEND_FILE_COPY_FAILED.p("DockerHelper::sendFile()"), err), null);
				});

			stream.on("open", function()
				{
				stream.pipe(socket).on("finish", function()
					{
					logger.info(Language.NETCAT_FINISHED);

					socket.destroy();

					self.waitForOutput("ncfinished", callback);                                                        
					} );
				});
			} );
		} );
	}
}

module.exports = DockerHelper;
