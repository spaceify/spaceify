/**
 * Service by Spaceify Inc. 24.1.2016
 *
 * A single service object. Used for both provided and required services. For Spaceifys internal user.
 *
 * @class Service
 */

function Service(parent)
{
var self = this;

var isNodeJS = (typeof exports !== "undefined" ? true : false);

if(isNodeJS)
	{
	var api_path = process.env.PORT_80 ? "/api/" : "/var/lib/spaceify/code/";
	var config = require(api_path + "config")();
	}
else
	var config = new SpaceifyConfig();

var exposedMethods = {};
var status = config.CONNECTION_UNINITIALIZED;
var is_secure = false;
var service_name = "";
var connection = null;
var error = null;

var binaryListener = null;
var connectionListener = null;
var disconnectionListener = null;

self.init = function(_service_name, _is_secure, _connection, _err)
	{
	service_name = _service_name;
	is_secure = _is_secure;
	connection = _connection;
	error = _err;

	if(connection)
		{
		status = config.CONNECTED;

		connection.setBinaryListener(listenBinary);
		connection.setConnectionListener(listenConnection);
		connection.setDisconnectionListener(listenDisconnection);

		for(name in exposedMethods)									// Restore exposed methods automatically
			connection.exposeRpcMethod(name, exposedMethods[name].object, exposedMethods[name].method);

		if(connectionListener)
			connectionListener(self);
		}
	else
		status = config.CONNECTION_FAILED;
	}

self.disconnect = function()
	{
	if(connection)
		{
		status = config.CONNECTION_LOST;

		if(disconnectionListener)
			disconnectionListener(self);

		connection.setBinaryListener(null);						// Clear just the listeners from the connection, retain the service listeners!!!
		connection.setConnectionListener(null);
		connection.setDisconnectionListener(null);

		connection.close();										// Connection is already closed but do some cleanup
		connection = null;
		error = null;
		}
	}

self.reconnect = function(callback)
	{
	parent.reconnectService(service_name, function(service)
		{
		callback(service);
		});
	}

var listenBinary = function()
	{
	if(binaryListener)
		{
		var message = Array.prototype.slice.call(arguments);			// Message + service
		message.push(self);

		binaryListener.apply(this, message);
		}
	}

var listenConnection = function()
	{
	if(connectionListener)
		connectionListener(self);
	}

var listenDisconnection = function()
	{
	self.disconnect();
	}

self.setBinaryListener = function(listener)
	{
	binaryListener = (typeof listener == "function" ? listener : null);
	}
	
self.setConnectionListener = function(listener)
	{
	connectionListener = (typeof listener == "function" ? listener : null);
	}

self.setDisconnectionListener = function(listener)
	{
	disconnectionListener = (typeof listener == "function" ? listener : null);
	}

	// -- -- -- -- -- -- -- -- -- -- //
self.getStatus = function()
	{
	return status;
	}

self.getName = function()
	{
	return service_name;
	}

self.getError = function()
	{
	return error;
	}

self.isSecure = function()
	{
	return is_secure;
	}

	// -- -- -- -- -- -- -- -- -- -- //
self.callRpc = function(/*methods, params, object, ...*/)
	{
	if(connection)
		{
		var params = Array.prototype.slice.call(arguments);
		connection.callRpc.apply(self, params);

		//connection.callRpc(methods, params, object);
		}
	}

self.exposeRpcMethod = function(name, object, method)
	{
	exposedMethods[name] = {object: object, method: method};

	if(connection)
		connection.exposeRpcMethod(name, object, method);
	}

self.notifyAll = function(method, params)
	{
	try {
		if(type == config.SERVER)
			connection.notifyAll(method, params);
		}
	catch(err)
		{}
	}

self.getBufferedAmount = function()
	{
	try {
		return connection.getBufferedAmount();	
		}
	catch(err)
		{}
	}

}

if(typeof exports !== "undefined")
	module.exports = Service;
