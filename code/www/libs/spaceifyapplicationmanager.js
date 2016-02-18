/**
 * Spaceify Application Manager by Spaceify Inc. 8.1.2016
 *
 * For Spaceify's internal use.
 *
 * Messages might arrive after the actual operation is finished. Therefore, both the operation 
 * and messaging are waited before returning to the caller
 *
 * @class SpaceifyApplicationManager
 */

function SpaceifyApplicationManager()
{
var self = this;

var config = new SpaceifyConfig();
var network = new SpaceifyNetwork();

var errors = [];
var locked = false;													// Allow only one operation at a time
var readyState = 0;
var returnCallback = null;
var readyError = null, readyData = null;

var spaceifyMessages = new SpaceifyMessages();

/**
 * @param   package          (1) unique name of a package in the spaceify registry or a URL to a package in the (2) GitHub repository or in the (3) Internet
 * @param   username         optional username/password for loading packages requiring credentials, set to "" (empty string) if not required
 * @param   password
 * @param   messageCallback  if provided (non null) the messages from the application manager are echoed to a user provided callback
 *                           if the first message to the callback is "<fail>" (config.MESSAGING_FAILED) setting up the messaging failed
 *                           if setup succeeds the callback gets UTF-8 strings as messages
 * @param   returnCallback   if provided (non null) the execution returns to the user defined callback
 * @return                   Node.js style error and data objects returned in the returnCallback
 */
self.installApplication = function(package, username, password, messageCallback, returnCallback)
	{
	process("installApplication", {package: package, username: username, password: password}, messageCallback, returnCallback);
	}

/**
 * @param   unique_name      unique name of an application to remove/start/stop/restart
 * @param   messageCallback  if provided (non null) the messages from the application manager are echoed to a user provided callback
 *                           if the first message to the callback is "<fail>" (config.MESSAGING_FAILED) setting up the messaging failed
 *                           if setup succeeds the callback gets UTF-8 strings as messages
 * @param   returnCallback   if provided (non null) the execution returns to the user defined callback
 * @return                   Node.js style error and data objects returned in the returnCallback
 */
self.removeApplication = function(unique_name, messageCallback, returnCallback)
	{
	process("removeApplication", {unique_name: unique_name}, messageCallback, returnCallback);
	}

self.startApplication = function(unique_name, messageCallback, returnCallback)
	{
	process("startApplication", {unique_name: unique_name}, messageCallback, returnCallback);
	}

self.stopApplication = function(unique_name, messageCallback, returnCallback)
	{
	process("stopApplication", {unique_name: unique_name}, messageCallback, returnCallback);
	}

self.restartApplication = function(unique_name, messageCallback, returnCallback)
	{
	process("restartApplication", {unique_name: unique_name}, messageCallback, returnCallback);
	}

self.logIn = function(password, messageCallback, returnCallback)
	{
	process("logIn", {password: password}, messageCallback, returnCallback);
	}

self.logOut = function(messageCallback, returnCallback)
	{
	process("logOut", {}, messageCallback, returnCallback);
	}

/**
 * @return  object array      the errors, as an array of error objects, from the latest operation. The format of an error object is;
 *                            { code: <code>, message: <message>, codes: <codes>, paths: <paths>, messages: <messages> }
 */
self.getErrors = function()
	{
	return errors;
	}

/**
 * @return  boolean           true if latest operation was successful and false if not
 */
self.success = function()
	{
	return errors.length == 0 ? true : false;
	}

/**
 * @param   types  an array of application types: "spacelet", "sandboxed" and/or "native" or empty for all types, e.g. ["spacelet", "sandboxed"]
 * @return         Node.js style error and data objects. data contains manifests of installed applications as JavaScript Objects
 *                 grouped by type {spacelet: [{}, ...], sandboxed: [{}, ...], native: [{}, ....]}
 */
self.getApplications = function(types, returnCallback)
	{
	process("getApplications", {types: types}, null, returnCallback);
	}

/**
 * locked
 * Allow only one operation at a time. If simultaneous operations are called using same instance of
 * this class problems start to appear. The lock helps to prevent this. Application manager on the edge allows 
 * one connection (operation) at a time, so attempts to circumvent the check here do not pose threat to it.
 */
var process = function(action, params, messageCallback, _returnCallback)
	{
	if(locked)
		{
		var code = "locked";
		var error = "Application manager is locked.";
		error = {code: code, codes: [code], paths: "SpaceifyApplicationManager::process", message: message, messages: [message]};

		if(messageCallback)
			messageCallback("Application manager is locked.");

		if(_returnCallback)
			_returnCallback(error, null);

		return;
		}

	errors = [];
	locked = true;
	readyState = 0;
	returnCallback = _returnCallback;

	spaceifyMessages.connect(readyCallback, messageCallback, function(err, data)
		{
		var post = {action: action};												// One object with action and custom parameters
		for(i in params)
			post[i] = params[i];

		network.POST_JSON(config.ACTION_URL, post, function(err, data)
			{
			readyError = err;
			readyData = data;

			readyCallback();
			});
		});
	}

var readyCallback = function()
	{
	if(++readyState == 2)
		{
		locked = false;

		errors = spaceifyMessages.getErrors();
		
		if(returnCallback)
			returnCallback(readyError, readyData);
		}
	}

}