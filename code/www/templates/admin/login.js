#!/usr/bin/env node
/**
 * View file
 * @template admin/index
 */
var fibrous = require("fibrous");
var config = require("/var/lib/spaceify/code/config")();
var Communicator = require("/var/lib/spaceify/code/www/libs/communicator");

function View()
{
var self = this;
var coreRPC = null;
var ca_crt = config.SPACEIFY_WWW_PATH + config.SPACEIFY_CRT;

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
	var is_logged_in = false, error = null;

	try {
		if(is_secure && user_data)												// Accept only secure connections
			{
			var communicator = new Communicator();
			coreRPC = communicator.sync.connect({hostname: null, port: config.CORE_PORT_WEBSOCKET_SECURE, is_secure: true, ca_crt: ca_crt, persistent: true}, config.WEBSOCKETRPCC);

			if(POST.action == "login" && !user_data.session_id)
				{
				user_data.session_id = coreRPC.sync.callRpc("adminLogIn", [POST.password], self);
				is_logged_in = true;
				}
			else if(POST.action == "logout")
				{
				coreRPC.sync.callRpc("adminLogOut", [user_data.session_id || ""], self);
				delete user_data.session_id;
				is_logged_in = false;
				}
			else
				is_logged_in = coreRPC.sync.callRpc("isAdminLoggedIn", [user_data.session_id || ""], self);
			}
		}
	catch(err)
		{
		error = err;
		}
	finally
		{
		if(coreRPC)
			coreRPC.close();
		}

	return { is_logged_in: is_logged_in, error: error, user_data: user_data };
	});

}

module.exports = new View();
