var fs = require("fs");
var fibrous = require("fibrous");
var Iptables = require("./iptables");

fibrous.run( function()
	{
	var iptables = new Iptables();
	iptables.sync.splashRestoreRules();
	}, function(err, data) { } );
