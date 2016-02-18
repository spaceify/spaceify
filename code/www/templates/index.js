#!/usr/bin/env node
/**
 * View file
 * @template index
 */
var fibrous = require("fibrous");
//var DHCPDLog = require("/var/lib/spaceify/code/dhcpdlog");
//var Iptables = require("/var/lib/spaceify/code/iptables");

function View()
{
var self = this;
//var iptables = new Iptables();
//var dhcpdlog = new DHCPDLog();

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
	/*var splash = true;
	try {
		var lease = dhcpdlog.getDHCPLeaseByIP(IP);																// Show splash if mac is not in the accepted list
		if(lease)
			splash = !iptables.hasSplashMAC(lease.mac_or_duid);
		}
	catch(err)
		{}*/
	var splash = false;

	return { splash: splash };
	});

}

module.exports = new View();
