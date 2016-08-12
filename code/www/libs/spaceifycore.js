"use strict";

/**
 * Spaceify core, 29.7.2015 Spaceify Oy
 * 
 * @class SpaceifyCore
 */

function SpaceifyCore()
{
// NODE.JS / REAL SPACEIFY - - - - - - - - - - - - - - - - - - - -
var isNodeJs = (typeof exports !== "undefined" ? true : false);
var isRealSpaceify = (typeof process !== "undefined" ? process.env.IS_REAL_SPACEIFY : false);
var apiPath = (isNodeJs && isRealSpaceify ? "/api/" : "/var/lib/spaceify/code/");

var classes = 	{
				SpaceifyNetwork: (isNodeJs ? function() {} : SpaceifyNetwork),
				SpaceifyConfig: (isNodeJs ? require(apiPath + "spaceifyconfig") : SpaceifyConfig),
				WebSocketRpcConnection: (isNodeJs ? require(apiPath + "websocketrpcconnection") : WebSocketRpcConnection)
				};
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

var self = this;

var config = new classes.SpaceifyConfig();
var network = new classes.SpaceifyNetwork();

var connection = null;
var secureConnection = null;

var useSecure = (isNodeJs ? true : network.isSecure());
var caCrt = (isNodeJs ? apiPath + config.SPACEIFY_CRT_WWW : "");

self.startSpacelet = function(unique_name, callback)
	{
	call("startSpacelet", [unique_name], useSecure, function(err, services, id, ms)
		{
		if(err)
			callback(err, null);
		else
			{
			var serviceNames = [];
			for(var s = 0; s < services.length; s++)							// Make service names array for convenience
				serviceNames.push(services[s].service_name);

			callback(null, {services: services, serviceNames: serviceNames}, id, ms);
			}
		});
	}

self.registerService = function(service_name, callback)
	{
	call("registerService", [service_name], useSecure, callback);
	}

self.unregisterService = function(service_name, callback)
	{
	call("unregisterService", [service_name], useSecure, callback);
	}

self.getService = function(service_name, unique_name, callback)
	{ // Gets provided service
	var service = (isCache() ? getCache().getService(service_name, unique_name) : null);

	if(service)
		callback(null, service, -1, 0);
	else
		call("getService", [service_name, unique_name], useSecure, function(err, data, id, ms)
			{
			if(!err && isCache())
				getCache().setService(data, unique_name);

			callback(err, data, id, ms);
			});
	}

self.getOpenServices = function(unique_names, callback)
	{
	call("getOpenServices", [unique_names], useSecure, callback);
	}

self.getManifest = function(unique_name, callback)
	{
	var manifest = (isCache() ? getCache().getManifest(unique_name) : null);

	if(manifest)
		callback(null, manifest, -1, 0);
	else
		call("getManifest", [unique_name, true], useSecure, function(err, data, id, ms)
			{
			if(!err && isCache())
				getCache().setManifest(unique_name, data);

			callback(err, data, id, ms);
			});
	}

self.isAdminLoggedIn = function(callback)
	{
	network.POST_JSON(config.OPERATION_URL, {type: "isAdminLoggedIn"}, function(err, data, id, ms)
		{
		callback((err ? err : null), (err ? false : data), id, ms);
		});
	}

self.isApplicationRunning = function(unique_name, callback)
	{
	call("isApplicationRunning", [unique_name], useSecure, callback);
	}

self.getServiceRuntimeStates = function(unique_name, callback)
	{
	call("getServiceRuntimeStates", [unique_name], useSecure, callback);
	}

self.getApplicationData = function(callback)
	{
	var i;

	call("getApplicationData", [], useSecure, function(err, data, id, ms)
		{
		if(!err && isCache())
			{
			for(i = 0; i < data.spacelet.length; i++)
				getCache().setApplication(data.spacelet[i]);

			for(i = 0; i < data.sandboxed.length; i++)
				getCache().setApplication(data.sandboxed[i]);

			/*for(i = 0; i < data.native.length; i++)
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
		call("getApplicationURL", [unique_name], useSecure, function(err, data, id, ms)
			{
			if(!err && isCache())
				getCache().setApplicationURL(unique_name, data);

			callback(err, data, id, ms);
			});
	}

self.setSplashAccepted = function(callback)
	{
	call("setSplashAccepted", [], useSecure, callback);
	}

self.setEventListeners = function(events, listeners, context, sessionId, callback)
	{
	call("setEventListeners", [events], useSecure, function(err, data, id, ms)
		{
		if(!err)
			{
			var wsRpcConnection = (!useSecure ? connection : secureConnection);

			for(var i = 0; i < events.length; i++)
				wsRpcConnection.exposeRpcMethod(events[i], context, listeners[i]);
			}

		callback(err, data, id, ms);
		});
	}

/*self.saveOptions = function(unique_name, directory, filename, data, callback)
	{
	var post = {unique_name: unique_name, directory: directory, filename: filename, data: data};
	network.POST_JSON(config.OPERATION_URL, post, callback);
	}

self.loadOptions = function(unique_name, directory, filename, callback)
	{
	var post = {unique_name: unique_name, directory: directory, filename: filename};
	network.POST_JSON(config.OPERATION_URL, post, callback);
	}*/

	// CONNECTION -- -- -- -- -- -- -- -- -- -- //
var call = function(method, params, isSecure, callback)
	{ // Open only one secure and unsecure connection for each SpaceifyCore instance
	if((!isSecure && !connection) || (isSecure && !secureConnection))
		{
		connect(isSecure, function(err, data, id, ms)
			{
			if(!err)
				callRpc(method, params, isSecure, callback);
			else
				callback(err, data, id, ms);
			});
		}
	else
		callRpc(method, params, isSecure, callback);
	}

var callRpc = function(method, params, isSecure, callback)
	{
	(!isSecure ? connection : secureConnection).callRpc(method, params, self, function(err, data, id, ms)
		{
		callback(err, data, id, ms);
		});
	}

var connect = function(isSecure, callback)
	{
	var port = !isSecure ? config.CORE_PORT : config.CORE_PORT_SECURE;

	var wsRpcConnection = new classes.WebSocketRpcConnection();
	!isSecure ? connection = wsRpcConnection : secureConnection = wsRpcConnection;

	var hostname = (isNodeJs ? config.EDGE_IP : config.EDGE_HOSTNAME);

	wsRpcConnection.connect({hostname: hostname, port: port, isSecure: isSecure, caCrt: caCrt}, callback);
	}

	// CACHE -- -- -- -- -- -- -- -- -- -- //
var getCache = function()
	{
	return (!isNodeJs && window && window.spaceifyCache ? window.spaceifyCache : null);
	}

var isCache = function()
	{
	var type = getCache();
	return (type == "undefined" || type == null ? false : true);
	}

}

if(typeof exports !== "undefined")
	module.exports = SpaceifyCore;