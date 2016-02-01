/**
 * Logger by Spaceify Inc. 29.7.2015
 *
 * @class Logger
 */

function Logger()
{
var self = this;
var isEnabled = true;
var printType = false;

var config = new SpaceifyConfig();

self.info = function(message)
	{
	if(isEnabled)
		console.log((printType ? "INFO: " : "") + message);
	}

self.error = function(message)
	{
	if(isEnabled)
		console.log((printType ? "ERROR: " : "") + message);
	}

self.force = function(message)
	{
	console.log(message);
	}
	
self.printErrors = function(err, print_path, print_code, print_type)
	{
	var message = "";

	if(err.messages)
		{
		for(var i=0; i<err.messages.length; i++)
			{
			var path = (err.paths[i] ? err.paths[i] + " - " : "");
			var code = (err.codes[i] ? "(" + err.codes[i] + ") " : "");
			message += (message != "" ? config.MESSAGE_SEPARATOR : "") + (print_path ? path : "") + (print_code ? code : "") + err.messages[i];
			}
		}
	else if(err.message)
		message = (err.code && print_code ? "(" + err.code + ") " : "") + err.message;

	if(print_type == 0)
		self.error(message);
	else if(print_type == 1)
		self.force(message);

	return message;
	}

}