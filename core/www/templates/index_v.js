#!/usr/bin/env node
/**
 * View file
 * @template index
 */
var fs  = require("fs");
var url = require("url");
var Config = require("../../config")();
var DHCPServer = require("../../dhcpserver");
var Iptables = require("../../iptables");

function View()
{
var self = this;
var iptables = new Iptables();
var dhcpserver = new DHCPServer();

self.getData = function(IP, URL, GET, POST, language, section, configuration)
	{
	var splash = true;
	try {
		var lease = dhcpserver.getDHCPLeaseByIP(IP);															// Show splash if mac is not in the accepted list
		if(lease)
			splash = !iptables.hasSplashMAC(lease.mac_or_duid);
		}
	catch(err)
		{}

	return { language: language.code, kiwiLanguage: language.kiwiLanguage, smartyLanguage: language.smartyLanguage, kiwiConfiguration: configuration.kiwiConfiguration, smartyConfiguration: configuration.smartyConfiguration, splash: splash };
	}

}

module.exports = new View();
