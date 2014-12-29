#!/usr/bin/env node
/**
 * Configuration and constants file for all templates
 */

function Configuration()
{
var self = this;

var configuration =
	{
	SPACELET: "spacelet",
	SANDBOXED_APPLICATION: "sandboxed_application",
	NATIVE_APPLICATION: "native_application",

	STANDARD: "standard",
	OPEN_LOCAL: "open_local",

	JAVASCRIPT: "javascript",
	CSS: "css",
	FILE: "file",
	RESOURCE: "resource",

	ACTIVE_TILE: "ACTIVE_TILE",
	OPTIONS: "OPTIONS",

	CLIENT_HTTP_SERVER: "client_http_server",
	CLIENT_HTTPS_SERVER: "client_https_server",

	PX: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
	};

self.make = function()
	{
	var smartyConfiguration = "";
	var kiwiConfiguration = configuration;

	for(i in kiwiConfiguration)												// Make smarty compatible configuration "file"
		smartyConfiguration += i + " = " + kiwiConfiguration[i] + "\r\n";

	return { "kiwiConfiguration": kiwiConfiguration, "smartyConfiguration": new Buffer(smartyConfiguration).toString('base64') };
	}

}

module.exports = new Configuration();
