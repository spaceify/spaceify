/**
 * Web Operation, 15.4.2016 Spaceify Oy
 * 
 * @class WebOperation
 */
var fibrous = require("fibrous");
var language = require("./language");
var SecurityModel = require("./securitymodel");
var SpaceifyError = require("./spaceifyerror");
var SpaceifyConfig = require("./spaceifyconfig");
var SpaceifyUtility = require("./spaceifyutility");
var WebSocketRpcConnection = require("./websocketrpcconnection.js");

function WebOperation()
{
var self = this;

var errorc = new SpaceifyError();
var config = new SpaceifyConfig();
var utility = new SpaceifyUtility();
var securityModel = new SecurityModel();

var secureConnection = null;
var caCrt = config.SPACEIFY_WWW_PATH + config.SPACEIFY_CRT;

/**
 * getData()
 *
 * @param   operation  the posted parameters; JavaScript Object {name: value, name: value, ...}
 * @param   userData   JavaScript Object {} for user data; the object is preserved between calls
 * @param   isSecure   defines whether the call is from a secure (true) or an insecure (false) web server
 * @return             a JavaScript Object containing the parameters to pass to the caller
 */
self.getData = fibrous( function(operation, userData, isSecure)
	{
	var isLoggedIn = false, error = null, data = null;

	try {
		if(!operation.type)
			throw errorc.errorFromObject(language.E_NO_OPERATION_DEFINED);

		// -- -- -- -- -- -- -- -- -- -- //
		if(operation.type == "installApplication" && isSecure && userData.sessionId)
			{
			isLoggedIn = securityModel.sync.isAdminLoggedIn(userData.sessionId, true);	// throws error if not logged in

			if(!operation.package)
				throw errorc.errorFromObject(language.E_UNDEFINED_PARAMETERS);

			var force = operation.force || "";
			var username = operation.username || "";
			var password = operation.password || "";

			connect.sync();
			data = secureConnection.sync.callRpc("installApplication", [operation.package, username, password, null, force, userData.sessionId], self);
			}
		// -- -- -- -- -- -- -- -- -- -- //
		else if(operation.type == "removeApplication" && isSecure && userData.sessionId)
			{
			isLoggedIn = securityModel.sync.isAdminLoggedIn(userData.sessionId, true);

			if(!operation.unique_name)
				throw errorc.errorFromObject(language.E_UNDEFINED_PARAMETERS);

			connect.sync();
			data = secureConnection.sync.callRpc("removeApplication", [operation.unique_name, userData.sessionId], self);
			}
		// -- -- -- -- -- -- -- -- -- -- //
		else if(operation.type == "startApplication" && isSecure && userData.sessionId)
			{
			isLoggedIn = securityModel.sync.isAdminLoggedIn(userData.sessionId, true);

			if(!operation.unique_name)
				throw errorc.errorFromObject(language.E_UNDEFINED_PARAMETERS);

			connect.sync();
			data = secureConnection.sync.callRpc("startApplication", [operation.unique_name, userData.sessionId], self);
			}
		// -- -- -- -- -- -- -- -- -- -- //
		else if(operation.type == "stopApplication" && isSecure && userData.sessionId)
			{
			isLoggedIn = securityModel.sync.isAdminLoggedIn(userData.sessionId, true);

			if(!operation.unique_name)
				throw errorc.errorFromObject(language.E_UNDEFINED_PARAMETERS);

			connect.sync();
			data = secureConnection.sync.callRpc("stopApplication", [operation.unique_name, userData.sessionId], self);
			}
		// -- -- -- -- -- -- -- -- -- -- //
		else if(operation.type == "restartApplication" && isSecure && userData.sessionId)
			{
			isLoggedIn = securityModel.sync.isAdminLoggedIn(userData.sessionId, true);

			if(!operation.unique_name)
				throw errorc.errorFromObject(language.E_UNDEFINED_PARAMETERS);

			connect.sync();
			data = secureConnection.sync.callRpc("restartApplication", [operation.unique_name, userData.sessionId], self);
			}
		// -- -- -- -- -- -- -- -- -- -- //
		else if(operation.type == "requestMessages" && isSecure && userData.sessionId)
			{
			isLoggedIn = securityModel.sync.isAdminLoggedIn(userData.sessionId, true);

			connect.sync();
			data = secureConnection.sync.callRpc("requestMessages", [userData.sessionId], self);
			}
		// -- -- -- -- -- -- -- -- -- -- //
		else if(operation.type == "getSettings" && isSecure && userData.sessionId)
			{
			isLoggedIn = securityModel.sync.isAdminLoggedIn(userData.sessionId, true);

			connect.sync();
			data = secureConnection.sync.callRpc("getSettings", [userData.sessionId], self);
			}
		// -- -- -- -- -- -- -- -- -- -- //
		else if(operation.type == "saveSettings" && isSecure && userData.sessionId)
			{
			isLoggedIn = securityModel.sync.isAdminLoggedIn(userData.sessionId, true);

			connect.sync();
			data = secureConnection.sync.callRpc("saveSettings", [operation.settings || {}, userData.sessionId], self);
			}
		// -- -- -- -- -- -- -- -- -- -- //
		else if(operation.type == "getServiceRuntimeStates" && isSecure && userData.sessionId)
			{
			isLoggedIn = securityModel.sync.isAdminLoggedIn(userData.sessionId, true);

			connect.sync();
			data = secureConnection.sync.callRpc("getServiceRuntimeStates", [userData.sessionId], self);
			}
		// -- -- -- -- -- -- -- -- -- -- //
		else if(operation.type == "getApplications")
			{
			connect.sync();

			data = {spacelet: [], sandboxed: [], native: []};
			var type, dbApps = secureConnection.sync.callRpc("getApplications", [operation.types || ""], self);

			for(var i = 0; i < dbApps.length; i++)
				{
				type = dbApps[i].type;

				var path = "";
				if(type == config.SPACELET)
					path = config.SPACELETS_PATH;
				else if(type == config.SANDBOXED)
					path = config.SANDBOXED_PATH;
				else if(type == config.NATIVE)
					path = config.NATIVE_PATH;

				var manifest = utility.sync.loadJSON(path + dbApps[i].unique_directory + config.APPLICATION_PATH + config.MANIFEST, true);
				manifest.isRunning = dbApps[i].isRunning;
				data[type].push(manifest);
				}
			}
		// -- -- -- -- -- -- -- -- -- -- //
		else if(operation.type == "logIn" && isSecure && !userData.sessionId)
			{
			connect.sync();
			userData.sessionId = secureConnection.sync.callRpc("adminLogIn", [operation.password || ""], self);

			data = { isLoggedIn: true };

			isLoggedIn = true;
			}
		// -- -- -- -- -- -- -- -- -- -- //
		else if(operation.type == "logOut" && isSecure)
			{
			connect.sync();
			secureConnection.sync.callRpc("adminLogOut", [userData.sessionId || ""], self);

			delete userData.sessionId;
			data = { isLoggedIn: false };

			isLoggedIn = false;
			}
		// -- -- -- -- -- -- -- -- -- -- //
		else if(operation.type == "isAdminLoggedIn")
			{
			if(userData.sessionId)
				{
				isLoggedIn = securityModel.sync.isAdminLoggedIn(userData.sessionId, false);
				data = isLoggedIn;
				}
			}
		// -- -- -- -- -- -- -- -- -- -- //
		else
			throw errorc.errorFromObject(language.E_UNDEFINED_OPERATION_DEFINED);
		}
	catch(err)
		{
		error = err;
		}
	finally
		{
		if(secureConnection)
			secureConnection.close();
		secureConnection = null;
		}

	return { isLoggedIn: isLoggedIn, error: error, data: data };
	});

var connect = fibrous( function()
	{
	secureConnection = new WebSocketRpcConnection();
	secureConnection.sync.connect({hostname: config.ALL_IPV4_LOCAL, port: config.APPMAN_PORT_SECURE, isSecure: true, caCrt: caCrt});
	});

}

module.exports = WebOperation;
