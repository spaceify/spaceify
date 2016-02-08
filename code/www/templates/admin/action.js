#!/usr/bin/env node
/**
 * View file
 * @template admin/index
 */
var fibrous = require("fibrous");
var config = require("/var/lib/spaceify/code/config")();
var utility = require("/var/lib/spaceify/code/utility");
var SecurityModel = require("/var/lib/spaceify/code/securitymodel");
//var WebSocketRPCClient = require("/var/lib/spaceify/code/websocketrpcclient");
var Communicator = require("/var/lib/spaceify/code/www/libs/communicator");

function View()
{
var self = this;
var srvRPC = null;
var ca_crt = config.SPACEIFY_WWW_PATH + config.SPACEIFY_CRT;
var securityModel = new SecurityModel();

/**
 * getData()
 *
 * @param   IP         the IP from the HTTP requests socket (request.connection.remoteAddress)
 * @param   URL        the URL is from request.url
 * @param   GET        the parameters passed in the URL; JavaScript Object {name: value, name: value, ...}
 * @param   POST       the posted parameters; JavaScript Object {name: value, name: value, ...}
 * @param   user_data  used defined session data; initially an empty JavaScript Object {}
 *                     on next calls data contains user saved data if it is stored (see @return)
 * @param   is_secure  defines whether the call is from a secure (true) or an insecure (false) web server
 * @param   language   language strings for the template; JavaScript Object { section: #1, locale: #2, language: #3, language_smarty: #4 }
 *                     #1 = the section in a language file where the strings for a template are loded from, e.g., index, admin/index, admin/login
 *                     #2 = e.g. fi_FI, fi_SE, en_US, ...
 *                     #3/#4 = Kiwi/Smarty template compatible languages
 *                     The language object always contains the global strings and the strings for a particular web page/template (see www/languages/en_US.json)
 * @return             a JavaScript Object containing the parameters to pass to the template, e.g., {hello: "world"}
 *                     RETURN USER DATA IF IT IS MODIFIED AND NEEDS TO BE STORED ({..., user_data: user_data})!!!
 */
self.getData = fibrous( function(IP, URL, GET, POST, user_data, is_secure, language)
	{
	var is_logged_in = false, error = null, data = null;

	try {
		if(!POST["action"])
			throw utility.errorFromObject(language.language.E_NO_ACTION_DEFINED);

		var action = POST["action"];

		// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
		if(action == "installApplication" && is_secure && user_data && user_data.session_id)
			{
			is_logged_in = securityModel.sync.isAdminLoggedIn(user_data.session_id);	// throws error if not

			if(!POST["package"])
				throw utility.errorFromObject(language.E_UNDEFINED_PARAMETERS);

			var username = POST["username"] || "";
			var password = POST["password"] || "";

			connect.sync(config.APPMAN_PORT_WEBSOCKET_SECURE);
			data = srvRPC.sync.callRpc("installApplication", [POST["package"], username, password, null, user_data.session_id, false], self);
			}
		// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
		else if(action == "removeApplication" && is_secure && user_data && user_data.session_id)
			{
			is_logged_in = securityModel.sync.isAdminLoggedIn(user_data.session_id);

			if(!POST["unique_name"])
				throw utility.errorFromObject(language.E_UNDEFINED_PARAMETERS);

			connect.sync(config.APPMAN_PORT_WEBSOCKET_SECURE);
			data = srvRPC.sync.callRpc("removeApplication", [POST["unique_name"], user_data.session_id, false], self);
			}
		// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
		else if(action == "startApplication" && is_secure && user_data && user_data.session_id)
			{
			is_logged_in = securityModel.sync.isAdminLoggedIn(user_data.session_id);

			if(!POST["unique_name"])
				throw utility.errorFromObject(language.E_UNDEFINED_PARAMETERS);

			connect.sync(config.APPMAN_PORT_WEBSOCKET_SECURE);
			data = srvRPC.sync.callRpc("startApplication", [POST["unique_name"], user_data.session_id, false], self);
			}
		// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
		else if(action == "stopApplication" && is_secure && user_data && user_data.session_id)
			{
			is_logged_in = securityModel.sync.isAdminLoggedIn(user_data.session_id);

			if(!POST["unique_name"])
				throw utility.errorFromObject(language.E_UNDEFINED_PARAMETERS);

			connect.sync(config.APPMAN_PORT_WEBSOCKET_SECURE);
			data = srvRPC.sync.callRpc("stopApplication", [POST["unique_name"], user_data.session_id, false], self);
			}
		// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
		else if(action == "restartApplication" && is_secure && user_data && user_data.session_id)
			{
			is_logged_in = securityModel.sync.isAdminLoggedIn(user_data.session_id);

			if(!POST["unique_name"])
				throw utility.errorFromObject(language.E_UNDEFINED_PARAMETERS);

			connect.sync(config.APPMAN_PORT_WEBSOCKET_SECURE);
			data = srvRPC.sync.callRpc("restartApplication", [POST["unique_name"], user_data.session_id, false], self);
			}
		// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
		else if(action == "requestMessages" && is_secure && user_data && user_data.session_id)
			{
			is_logged_in = securityModel.sync.isAdminLoggedIn(user_data.session_id);

			connect.sync(config.APPMAN_PORT_WEBSOCKET_SECURE);
			data = srvRPC.sync.callRpc("requestMessages", [user_data.session_id, false], self);
			}
		// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
		else if(action == "getApplications")
			{
			connect.sync(config.APPMAN_PORT_WEBSOCKET_SECURE);

			data = {spacelet: [], sandboxed: [], native: []};
			var type, apps = srvRPC.sync.callRpc("getApplications", [POST["types"] || ""], self);

			for(var i=0; i<apps.length; i++)
				{
				type = apps[i].type;
				if(type == config.SPACELET)
					path = config.SPACELETS_PATH;
				else if(type == config.SANDBOXED)
					path = config.SANDBOXED_PATH;
				else if(type == config.NATIVE)
					path = config.NATIVE_PATH;

				var manifest = utility.sync.loadJSON(path + apps[i].unique_directory + config.APPLICATION_PATH + config.MANIFEST, true);
				manifest.is_running = apps[i].is_running;
				data[type].push(manifest);
				}
			}
		// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
		else if(action == "logIn" && is_secure && user_data && !user_data.session_id)
			{
			connect.sync(config.CORE_PORT_WEBSOCKET_SECURE);

			user_data.session_id = srvRPC.sync.callRpc("adminLogIn", [POST["password"] || ""], self);
			is_logged_in = true;

			data = {is_logged_in: is_logged_in};
			}
		// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
		else if(action == "logOut" && is_secure && user_data)
			{
			connect.sync(config.CORE_PORT_WEBSOCKET_SECURE);

			srvRPC.sync.callRpc("adminLogOut", [user_data.session_id || ""], self);
			delete user_data.session_id;
			is_logged_in = false;

			data = {is_logged_in: is_logged_in};
			}
		// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
		else
			throw utility.errorFromObject(language.E_UNDEFINED_ACTION_DEFINED);
		}
	catch(err)
		{
		error = err;
		}
	finally
		{
		if(srvRPC)
			srvRPC.close();
		}

	return { is_logged_in: is_logged_in, error: error, data: data };
	});

var connect = fibrous( function(port)
	{
	var communicator = new Communicator();
	srvRPC = communicator.sync.connect({hostname: null, port: port, is_secure: true, ca_crt: ca_crt, persistent: true}, config.WEBSOCKETRPCC);
	});

}

module.exports = new View();
