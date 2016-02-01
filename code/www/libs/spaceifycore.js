/**
 * Spaceify core by Spaceify Inc. 29.7.2015
 *
 * @class SpaceifyCore
 */

function SpaceifyCore()
{
var self = this;

var isNodeJS = (typeof exports !== "undefined" ? true : false);

if(isNodeJS)
	{
	var api_path = process.env.PORT_80 ? "/api/" : "/var/lib/spaceify/code/";

	var config = require(api_path + "config")();
	var _Communicator = require(api_path + "www/libs/communicator.js");

	var ca_crt = api_path + "www/" + config.SPACEIFY_CRT;
	}
else
	{
	var config = new SpaceifyConfig();
	var _Communicator = Communicator;

	var ca_crt = "";
	}

var connection = null;
var secure_connection = null;

self.startSpacelet = function(unique_name, callback)
	{
	call("startSpacelet", [unique_name], false, function(err, services, id, ms)
		{
		if(err)
			callback(err, null);
		else
			{
			var service_names = [];
			for(var s=0; s<services.length; s++)								// Make service names array for convenience
				{
				if(services[s].service_type == config.OPEN)
					service_names.push(services[s].service_name);
				}

			callback(null, {services: services, service_names: service_names});
			}
		});
	}

self.getService = function(service_name, unique_name, callback)
	{ // Gets provided service
	var service = (isCache() ? getCache().getService(service_name, unique_name) : null);

	if(service)
		callback(null, service, -1, 0);
	else
		call("getService", [service_name, unique_name], false, function(err, data, id, ms)
			{
			if(!err && isCache())
				getCache().setService(data, unique_name);

			callback(err, data, id, ms);
			});
	}

self.getManifest = function(unique_name, callback)
	{
	var manifest = (isCache() ? getCache().getManifest(unique_name) : null);

	if(manifest)
		callback(null, manifest, -1, 0);
	else
		call("getManifest", [unique_name], false, function(err, data, id, ms)
			{
			if(!err && isCache())
				getCache().setManifest(unique_name, data);

			callback(err, data, id, ms);
			});
	}

self.isAdminLoggedIn = function(session_id, callback)
	{
	call("isAdminLoggedIn", [session_id], true, callback);
	}

self.saveOptions = function(session_id, unique_name, directory, filename, data, callback)
	{
	call("saveOptions", [session_id, unique_name, directory, filename, data], true, callback);
	}

self.loadOptions = function(session_id, unique_name, directory, filename, callback)
	{
	call("loadOptions", [session_id, unique_name, directory, filename], true, callback);
	}

self.getApplicationData = function(callback)
	{
	call("getApplicationData", [], false, function(err, data, id, ms)
		{
		if(!err && isCache())
			{
			for(var i=0; i<data.spacelets.length; i++)
				getCache().setApplication(data.spacelets[i]);

			for(var i=0; i<data.sandboxed.length; i++)
				getCache().setApplication(data.sandboxed[i]);

			/*for(var i=0; i<data.native.length; i++)
				getCache().setApplication(data.native[i]);*/
			}

		callback(err, data, id, ms);
		});
	}

self.getApplicationURL = function(unique_name, callback)
	{
	var urls = (isCache() ? getCache().getApplicationURL(unique_name) : null);

	if(urls)
		callback(null, urls, -1, 0);
	else
		call("getApplicationURL", [unique_name], false, function(err, data, id, ms)
			{
			if(!err && isCache())
				getCache().setApplicationURL(unique_name, data);

			callback(err, data, id, ms);
			});
	}

self.setSplashAccepted = function(callback)
	{
	call("setSplashAccepted", [], false, callback);
	}

self.isApplicationRunning = function(unique_name, callback)
	{
	var is_running = (isCache() ? getCache().isRunning(unique_name) : false);

	if(is_running === null)
		callback(null, true, -1, 0);
	else
		call("isApplicationRunning", [unique_name], false, function(err, data, id, ms)
			{
			if(!err && isCache())
				getCache().setRunning(unique_name, data);

			callback(err, data, id, ms);
			});
	}

self.setSplashAccepted = function(callback)
	{
	call("setSplashAccepted", [], false, callback);
	}

self.registerService = function(service_name, callback)
	{
	call("registerService", [service_name], true, callback);
	}

	// CONNECTION -- -- -- -- -- -- -- -- -- -- //
var call = function(method, params, is_secure, callback)
	{ // Open only one insecure and secure connection for each SpaceifyCore instance
	if((!is_secure && !connection) || (is_secure && !secure_connection))
		{
		connect(is_secure, function(err, data, id, ms)
			{
			if(!err)
				callRpc(method, params, is_secure, callback);
			else
				callback(err, data, id, ms);
			});
		}
	else
		callRpc(method, params, is_secure, callback);
	}

var callRpc = function(method, params, is_secure, callback)
	{
	(!is_secure ? connection : secure_connection).callRpc(method, params, self, function(err, data, id, ms)
		{
		callback(err, data, id, ms);
		});
	}

var connect = function(is_secure, callback)
	{
	if(isNodeJS || (window && window.WebSocket))
		port = !is_secure ? config.CORE_PORT_WEBSOCKET : config.CORE_PORT_WEBSOCKET_SECURE;
	else
		port = !is_secure ? config.CORE_PORT_ENGINEIO : config.CORE_PORT_ENGINEIO_SECURE;

	var communicator = new _Communicator();
	communicator.connect({hostname: config.EDGE_IP, port: port, is_secure: is_secure, ca_crt: ca_crt}, config.WEBSOCKETRPCC, function(err, data, id, ms)
		{
		!is_secure ? connection = data : secure_connection = data;

		callback(err, data, id, ms);
		});
	}

	// CACHE -- -- -- -- -- -- -- -- -- -- //
var getCache = function()
	{
	return (typeof window !== "undefined" && window.spaceifyCache ? window.spaceifyCache : null);
	}

var isCache = function()
	{
	var type = getCache();
	return (type == "undefined" || type == null ? false : true);
	}

}

if(typeof exports !== "undefined")
	module.exports = SpaceifyCore;