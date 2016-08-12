"use strict";

/**
 * Spaceify Application Manager, 8.1.2016 Spaceify Oy
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

var errorc = new SpaceifyError();
var config = new SpaceifyConfig();
var network = new SpaceifyNetwork();
var utility = new SpaceifyUtility();

var id = -1;
var ms = -1;
var locked = false;													// Allow only one operation at a time
var readySequence = 0;
var type = null;
var params = null;
var origin = null;
var readyErr = null;
var readyData = null;
var setupMessaging = true;
var operationHandler = null;
var spaceifyMessages = new SpaceifyMessages();

/**
 * @param   package            (1) unique name of a package in the spaceify registry or a URL to a package in the (2) GitHub repository or in the (3) Internet
 * @param   username           optional username/password for loading packages requiring credentials, set to "" (empty string) if not required
 * @param   password
 * @param   handler            custom handlet callback, null if application doesn't have one
 * @param   origin             callbacks for different types of Application manager messages:
 *                             error, warning, failed, message, question, questionTimedOut
 */
self.installApplication = function(applicationPackage, username, password, force, origin, handler)
	{
	setup("installApplication", {package: applicationPackage, username: username, password: password, force: force, }, origin, handler);
	}

/**
 * @param   unique_name       unique name of an application to remove/start/stop/restart
 * @param   origin            callbacks for different types of Application manager messages:
 *                            error, warning, failed, message, question, questionTimedOut
 * @param   handler           application defined callback, null if application doesn't have one
 */
self.removeApplication = function(unique_name, origin, handler)
	{
	setup("removeApplication", {unique_name: unique_name}, origin, handler);
	}

self.startApplication = function(unique_name, origin, handler)
	{
	setup("startApplication", {unique_name: unique_name}, origin, handler);
	}

self.stopApplication = function(unique_name, origin, handler)
	{
	setup("stopApplication", {unique_name: unique_name}, origin, handler);
	}

self.restartApplication = function(unique_name, origin, handler)
	{
	setup("restartApplication", {unique_name: unique_name}, origin, handler);
	}

self.logIn = function(password, origin, handler)
	{
	setupMessaging = false;
	setup("logIn", {password: password}, origin, handler);
	}

self.logOut = function(origin, handler)
	{
	setupMessaging = false;
	setup("logOut", {}, origin, handler);
	}

self.isAdminLoggedIn = function(origin, handler)
	{
	setup("isAdminLoggedIn", {}, origin, handler);
	}

self.getCoreSettings = function(origin, handler)
	{
	setup("getCoreSettings", {}, origin, handler);
	}

self.saveCoreSettings = function(settings, origin, handler)
	{
	setup("saveCoreSettings", {settings: settings}, origin, handler);
	}

self.getEdgeSettings = function(origin, handler)
	{
	setup("getEdgeSettings", {}, origin, handler);
	}

self.saveEdgeSettings = function(settings, origin, handler)
	{
	setup("saveEdgeSettings", {settings: settings}, origin, handler);
	}

self.getServiceRuntimeStates = function(origin, handler)
	{
	setup("getServiceRuntimeStates", {}, origin, handler);
	}

/**
 * @param   types   an array of application types: "spacelet", "sandboxed" and/or "native" or empty for all types, e.g. ["spacelet", "sandboxed"]
 * @param   origin  callbacks for different types of Application manager messages:
 *                  error, warning, failed, message, question, questionTimedOut
 * @return          Node.js style error and data objects. data contains manifests of installed applications as JavaScript Objects
 *                  grouped by type {spacelet: [{}, ...], sandboxed: [{}, ...], native: [{}, ....]}
 */
self.getApplications = function(types, origin, handler)
	{
	setup("getApplications", {types: types}, origin, handler);
	}

/**
 * @param   types  an array of application types: "spacelet", "sandboxed" and/or "native" or empty for all types, e.g. ["spacelet", "sandboxed"]
 * @return         Node.js style error and data objects. data contains manifests of published packages as JavaScript Objects and MySQL query information
 *                 {spacelet: [{}, ...], sandboxed: [{}, ...], native: [{}, ....], MySQL}.
 */
self.appStoreGetPackages = function(search, returnCallback)
	{
	var search = JSON.stringify(search);
	var content = 'Content-Disposition: form-data; name="search";\r\nContent-Type: plain\/text; charset=utf-8';

	network.POST_FORM(config.EDGE_APPSTORE_GET_PACKAGES_URL, [{content: content, data: search}], "application/json", function(err, response)
		{
		var err = null, data = null;

		try {
			data = JSON.parse(response.replace(/&quot;/g,'"'));

			if(data.error)
				{
				err = data.error;
				data = null;
				}
			}
		catch(err)
			{
			err = errorc.makeErrorObject("JSON", "Failed to get packages: JSON.parse failed", "SpaceifyApplicationManager::appStoreGetPackages");
			}

		returnCallback(err, data);
		});
	}

/**
 * 
 */
var setup = function(type_, params_, origin_, handler)
	{
	type = type_;
	ms = Date.now();
	params = params_;
	origin = origin_;
	operationHandler = handler;
	id = utility.randomString(16, true);

	if(locked)
		origin.error(errorc.makeErrorObject("locked", "Application manager is locked.", "SpaceifyApplicationManager::setup"), null);
	else
		{
		if(setupMessaging)												// Set up messaging before posting the operation
			{ readySequence = 0; spaceifyMessages.connect(self, origin); }
		else															// 	Do the operation without messaging
			{ readySequence = 1; self.success(); }
		}
	}

self.fail = function(err)
	{ // Failed to set up the messaging.
	readyErr = err;
	readyData = null;
	setupMessaging = true;
	self.ready(2);
	}

self.success = function()
	{ // Messaging is now set up (or bypassed), post the operation.
	locked = true;
	setupMessaging = true;

	var post = {type: type};												// One object with operation and custom parameters
	for(var i in params)
		post[i] = params[i];

	network.POST_JSON(config.OPERATION_URL, post, function(err, data)
		{
		readyErr = err;
		readyData = data;
		self.ready(1);
		});
	}

self.ready = function(sequence)
	{ // Either operation or messaging finishes first. Wait for both of them to finish.
	readySequence += sequence;
	if(readySequence != 2)
		return;

	locked = false;

	var errors = spaceifyMessages.getErrors();

	if(readyErr || errors.length > 0)
		origin.error(readyErr ? [readyErr] : errors, id, Date.now() - ms);
	else if(typeof operationHandler == "function")
		operationHandler(readyData, id, Date.now() - ms);
	}

 /*
 * @param   result             the user selected answer either in the short or long format
 * @param   answerCallBackId   the id given by Application manager in a call to questionsCallback
 */
self.answer = function(result, answerCallBackId)
	{
	spaceifyMessages.answer(result, answerCallBackId);
	}

}