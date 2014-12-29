var fs = require("fs");
var fibrous = require("fibrous");
var Config = require("./config")();
var Iptables = require("./iptables");

fibrous.run( function()
	{
	var iptables = new Iptables();
	iptables.sync.splashRestoreRules();
	});
