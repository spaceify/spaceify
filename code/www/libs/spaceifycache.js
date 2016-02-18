/**
 * Spaceify Cache by Spaceify Inc. 29.7.2015
 *
 * A cache class to reduce unnecessary RPC calls by storing application data.
 * For Spaceify's internal use.
 *
 * @class SpaceifyCache
 */

function SpaceifyCache()
{
var self = this;

var ready_counter = 0;

var applications = {};
var EXPIRATION_TIME = 60 * 1000;

var config = new SpaceifyConfig();

self.setApplication = function(application)
	{
	if(!applications[application.unique_name])
		applications[application.unique_name] = {};

	applications[application.unique_name].manifest = application;
	applications[application.unique_name].is_running = application.is_running;
	}

self.getApplication = function(unique_name)
	{
	return (unique_name in applications ? applications[unique_name] : null);
	}

	// SERVICES -- -- -- -- -- -- -- -- -- -- //
self.setService = function(service, unique_name)
	{
	if(service != config.HTTP_SERVICE && service != config.HTTPS_SERVICE)
		return;

	if(!applications[unique_name])
		applications[unique_name] = {};

	if(!applications[unique_name].services)
		applications[unique_name].services = [];

	applications[unique_name].services.push(service);
	}

self.getService = function(service_name, unique_name)
	{ // Get service either by service name (when unique_name is not set) or by service name and unique_name.
	for(aun in applications)															// Iterate all applications
		{
		var services = (applications[aun].services ? applications[aun].services : []);	// Find from the services they have
		for(var s=0; s<services.length; s++)
			{
			var asn = services[s].service_name;

			// First condition = all applications have http and https services and they can be requested only by defining unique name. Otherwise return the requested service.
			// Second condition = only this rule can return http and https services. otherwise this rule is nonrelevant, because service names are unique in appliciations.
			if( (!unique_name && service_name == asn && service_name != "http" && service_name != "https") || 
			    (unique_name && unique_name == aun && service_name == asn) )
				return services[s];
			}
		}

	return null;
	}

	// MANIFEST -- -- -- -- -- -- -- -- -- -- //
self.setManifest = function(unique_name, manifest)
	{
	if(!applications[unique_name])
		applications[unique_name] = {};

	applications[unique_name].manifest = manifest;
	}

self.getManifest = function(unique_name)
	{
	return (applications[unique_name] && applications[unique_name].manifest ? applications[unique_name].manifest : null);
	}

	// RUNNING STATUS -- -- -- -- -- -- -- -- -- -- //
self.setRunning = function(unique_name, is_running)
	{
	if(!applications[unique_name])
		applications[unique_name] = {};

	applications[unique_name].is_running = is_running;
	applications[unique_name].is_running_start = Date.now();
	}

self.isRunning = function(unique_name)
	{
	if(!applications[unique_name] || !applications[unique_name].hasOwnProperty("is_running"))
		return null;

	var run_time = Date.now() - applications[unique_name].is_running_start;			// Running status expires after the expiration time
	return (run_time > EXPIRATION_TIME ? null : applications[unique_name].is_running);
	}

	// APPLICATION URLS -- -- -- -- -- -- -- -- -- -- //
self.setApplicationURL = function(unique_name, urls)
	{
	if(!applications[unique_name])
		applications[unique_name] = {};

	applications[unique_name].urls = urls;
	applications[unique_name].urls_start = Date.now();
	}

self.getApplicationURL = function(unique_name)
	{
	if(!applications[unique_name] || !applications[unique_name].hasOwnProperty("urls"))
		return null;

	var urls_time = Date.now() - applications[unique_name].urls_start;				// URLs expire after the expiration time
	return (urls_time > EXPIRATION_TIME ? null : applications[unique_name].urls);
	}

}