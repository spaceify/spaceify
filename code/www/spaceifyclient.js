/**
 * spaceifyclient - engine.io implementation, 16.12.2013 Spaceify Inc.
 */
var EDGE_HOSTNAME = "edge.spaceify.net";
var CORE_PORT_HTTP = 80;//58080;
var CORE_PORT_HTTPS = 443;//58443;
var CORE_PORT = 2948;
var CORE_PORT_SECURE = 4948;

var SESSION_ID_COOKIE = "session_id";

var E_NO_CONNECTION = "Failed to connect to: ";
var E_NO_CONNECTION_CODE = 1;
var E_NO_SERVICE = 2;

var callSequence = 1;

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// LOGGER   // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
function Logger()
{
var self = this;
var isEnabled = true;
var printType = false;

self.info = function(message)
	{
	if(isEnabled)
		console.log((printType ? "INFO: " : "") + message);
	}

self.error = function(message)
	{
	if(isEnabled)
		console.log((printType ? "ERROR: " : "") + message);
	}
}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// RPC CLIENT - This is a JSON-RPC 2.0 compliant client  // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
function RPC()
{
var self = this;

var options = {};
var socket = { readyState: "closed" };
var callbacks = new Object();
var rpcMethods = new Object();
var logger = new Logger();
var connectionListenerCallback = null;
var uri = "";

// The callback is a standard node-type callback with error as its first parameter
self.connect = function(opts, callback)
	{
	options.hostname = opts.hostname || EDGE_HOSTNAME;
	options.port = opts.port || CORE_PORT;
	options.forceSecure = opts.forceSecure || false;
	options.persistent = opts.persistent || false;						// Reduce overhead by keeping connection open between calls

	uri = (!$SN.isSecure() && !options.forceSecure ? "ws" : "wss") + "://" + options.hostname + ":" + options.port + "/" + "json-rpc";

	logger.info("Connecting to " + uri);
	socket = eio.Socket(uri, {transports: ["websocket", "polling"]});

	socket.on("open", function()										// Fired upon successful connection.
		{
		callback(null, true);
		});

	socket.on("close", function()										// Fired upon disconnection.
		{
		logger.info("Disconnected from " + uri);

		if(typeof connectionListenerCallback == "function")
			{
			connectionListenerCallback(true);
			connectionListenerCallback = null;
			}

		callbacks = new Object();
		rpcMethods = new Object();
		});

	socket.on("error", function()										// Fired when an error occurs.
		{
		self.close();

		if(typeof callback == "function")
			callback({codes: [E_NO_CONNECTION_CODE], messages: [E_NO_CONNECTION + options.hostname + ":" + options.port + ", subprotocol: " +  "json-rpc"]}, null);
		});

	socket.on("message", function(message)								// Fired when data is received from the server.
		{
		onMessage(message);
		});
	}

self.close = function()
	{
	connectionListenerCallback = null;

	if(socket.readyState == "open")
		socket.close();
	}

self.connectionListener = function(callback)
	{
	connectionListenerCallback = (typeof callback == "function" ? callback : null);
	}

self.exposeMethod = function(name, object_, method_)
	{
	rpcMethods[name] = {object: object_, method: method_};
	}

self.call = function(methods, params, object, listener)
	{
	if(socket.readyState != "open")
		return;

	var callObject;
	var callObjects = [];
	var isBatch = false;

	if(!(methods instanceof Array))
		{
		methods = [methods];
		params = [params];
		}
	else
		isBatch = true;

	for(var i=0; i<methods.length; i++)
	{
		if(typeof listener == "function")											// call: expects a response object
		{
			callObject = {jsonrpc: "2.0", method: methods[i], params: params[i], id: callSequence};
			callbacks[callSequence] = {object: object, listener: listener};
			callSequence++;
		}
		else																		// notification: doesn't expect a response object
			callObject = {jsonrpc: "2.0", method: methods[i], params: params[i], id: null};

		callObjects.push(callObject);
	}

	sendMessage(isBatch ? callObjects : callObjects[0]);
	}

var sendMessage = function(message)
	{
	logger.info("RPC::sendMessage(). " + JSON.stringify(message));

	if(socket.readyState == "open")
		socket.send(JSON.stringify(message));	
	}

var onMessage = function(message)
	{
	logger.info("RPC::onMessage() " + message);

	var reqa;
	var rspa = [];
	var isBatch = false;

	try {
		reqa = JSON.parse(message);
		}
	catch(err)
		{
		sendMessage({jsonrpc: "2.0", error: {code: -32700, message: "Invalid JSON."}, id: null});
		return;
		}

	if(!(reqa instanceof Array))
		reqa = [reqa];
	else
		isBatch = true;

	// ................................................................................................
	if(reqa[0].method) // ............................................... Received an external RPC Call
		{
		for(var r = 0; r <  reqa.length; r++)
			{
			if(!reqa[r].jsonrpc || reqa[r].jsonrpc != "2.0" || !reqa[r].method)				// Invalid JSON-RPC
				{
				rspa.push({jsonrpc: "2.0", error: {code: -32600, message: "Invalid JSON-RPC."}, id: null});
				continue;
				}

			if(!rpcMethods.hasOwnProperty(reqa[r].method))									// Unknown method
				{
				if(reqa[r].id != null)
					rspa.push({jsonrpc: "2.0", error: {code: -32601, message: "Method " + reqa[r].method + " not found."}, id: reqa[r].id});
				continue;
				}

			try	{																			// Call the method rpcMethod[0] of object rpcMethod[0]
				var rpcMethod = rpcMethods[reqa[r].method];
				var result = rpcMethod.method.apply(rpcMethod.object, reqa[r].params);
				if(reqa[r].id != null)
					rspa.push({jsonrpc: "2.0", result: result, id: reqa[r].id});
				}
		catch(err)
			{
			if(reqa[r].id != null)
				rspa.push({jsonrpc: "2.0", error: err, id: reqa[r].id});
			}
		}

		if(isBatch && rspa.length > 0)
			sendMessage(rspa);
		else if(!isBatch && rspa.length > 0)
			sendMessage(rspa[0]);
		}
	// ....................................................................................................
	else // ............................................................. Returns from an internal RPC call
		{
		var calledOnce = false;

		for(r in reqa)
			{
			if(!reqa[r].id || !callbacks[reqa[r].id])
				continue;

			if(isBatch)																	// Batch request gets called only once with all the responses in a response array!!! Let the caller process the array.
				{
				if(!calledOnce) {
					callbacks[reqa[r].id].listener.apply(callbacks[reqa[r].id].object, [null, reqa, -1]); calledOnce = true; }
				}
			else																		// Single request gets always called only once!!!
				{
				if(typeof reqa[r].result != "undefined")
					callbacks[reqa[r].id].listener.apply(callbacks[reqa[r].id].object, [null, reqa[r].result, reqa[r].id]);
				else if(typeof reqa[r].error != "undefined")
					callbacks[reqa[r].id].listener.apply(callbacks[reqa[r].id].object, [reqa[r].error, null, reqa[r].id]);
				else if(!calledOnce)
					callbacks[reqa[r].id].listener.apply(callbacks[reqa[r].id].object, [null, null, reqa[r].id]);
				}

			delete callbacks[reqa[r].id];
			}

		if(!options.persistent)
			socket.close();
		}
	}

self.processBatchCall = function(data)
	{ // Process raw JSON-RPC objects returned by batch JSON-RPC call. Returns an array containing [{err: .., data: ...}, {err: ..., data: ....}, ...] objects.
	var result = [];
	for(var i=0; i<data.length; i++)
		{
		if(data[i].error)
			result.push({error: data[i].error, result: null});
		else	// result
			result.push({error: null, result: data[i].result});
		}

	return result;
	}

}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// SPACEIFY CORE  // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
function SpaceifyCore()
{
var self = this;

self.callMultiple = function(methods, params, callback, results)
	{ // Handle multiple calls at once.
	if(!results)
		results = [];

	if(methods.length == 0 && typeof callback == "function")									// All methdos processed, return to caller
		return callback(results);
	else if(methods.length == 0)
		return results;

	var method = methods.shift();																// Get next method and its parameters
	var parama = params.shift();

	parama.push(function(err, data)																// Add callback to parameters and apply the method
		{
		results.push({err: err, data: data});														// Add to results and call the next method
		self.callMultiple(methods, params, callback, results);
		});
	self[method].apply(self, parama);
	}

self.startSpacelet = function(unique_name, service_name, callback)
	{
	connect("startSpacelet", [unique_name], false, function(err, data)
		{
		if(err)
			callback(err, null);
		else
			{
			var services = data;
			var service = $SU.getService(services, service_name);
			if(service)																				// Try to connect to the the requested service
				new SpaceifyRPC().open(service, false, function(err, rpc)
					{
					callback(err ? err : null, err ? null : {rpc: rpc, services: services});
					});
			else if(!service && service_name)														// Return error if service name was not in the spacelets services
				callback({codes: [E_NO_SERVICE], messages: ["Requested service " + service_name + " is not defined in the services of the spacelet " + unique_name]}, null);
			else																					// Return services if only starting the spacelet was requested
				callback(null, {rpc: null, services: services});
			}
		});
	}

self.getService = function(service_name, unique_name, callback)
	{
	connect("getService", [service_name, unique_name], false, callback);
	}

self.getServices = function(services, callback)
	{
	connect("getServices", [services], false, callback);
	}

self.getManifest = function(unique_name, callback)
	{
	connect("getManifest", [unique_name], false, callback);
	}

self.adminLogIn = function(password, callback)
	{
	connect("adminLogIn", [password], true, callback);
	}

self.adminLogOut = function(callback)
	{
	var session_id = $SU.getCookie(SESSION_ID_COOKIE);
	connect("adminLogOut", [session_id], true, callback);
	}

self.isAdminLoggedIn = function(callback)
	{
	var session_id = $SU.getCookie(SESSION_ID_COOKIE);
	connect("isAdminLoggedIn", [session_id], true, callback);
	}

self.saveOptions = function(unique_name, directory, filename, data, callback)
	{
	var session_id = $SU.getCookie(SESSION_ID_COOKIE);
	connect("saveOptions", [session_id, unique_name, directory, filename, data], true, callback);
	}

self.loadOptions = function(unique_name, directory, filename, callback)
	{
	var session_id = $SU.getCookie(SESSION_ID_COOKIE);
	connect("loadOptions", [session_id, unique_name, directory, filename], true, callback);
	}

self.getApplicationData = function(unique_name, callback)
	{
	connect("getApplicationData", [unique_name], false, callback);
	}

self.setSplashAccepted = function(callback)
	{
	connect("setSplashAccepted", [], false, callback);
	}

var connect = function(method, params, forceSecure, callback)
	{
	var rpc = new RPC();

	rpc.connect({hostname: EDGE_HOSTNAME, port: $SN.getCorePort(forceSecure), forceSecure: forceSecure, persistent: false}, function(err, data)
		{
		if(err)
			callback(err, null);
		else
			rpc.call(method, params, self, function(err, data) { callback(err ? err : null, err ? null : data); });
		});
	}

}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// SPACEIFY NETWORK  // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
function SpaceifyNetwork()
{
var self = this;

// Get the URL to the Spaceify Core
self.getEdgeURL = function()
	{
	return location.protocol + "//" + EDGE_HOSTNAME;
	}

// Get secure or unsecure URL
self.getWebServer = function(port, secure_port, forceSecure)
	{
	return location.protocol + "//" + EDGE_HOSTNAME + ":" + self.getPort(port, secure_port, forceSecure);
	}

self.getCoreWebServer = function(forceSecure)
	{
	return self.getWebServer(CORE_PORT_HTTP, CORE_PORT_HTTPS, forceSecure);
	}

// Get secure or unsecure port
self.getPort = function(port, secure_port, forceSecure)
	{
	return (!self.isSecure() && !forceSecure ? port : secure_port);
	}

self.getCorePort = function(forceSecure)
	{
	return self.getPort(CORE_PORT, CORE_PORT_SECURE, forceSecure);
	}
	
// Return true if current web page is encrypted
self.isSecure = function()
	{
	return (location.protocol == "http:" ? false : true);
	}

// Return current protocol
self.getProtocol = function(asScheme)
	{
	return (location.protocol == "http:" ? "http" : "http") + (asScheme ? "://" : "");
	}
	
// Parse GET from the url. Add origin part of the url to the returned object if requested.
self.parseGET = function(url, bOrigin)
	{
	var obj_get = {};
	var regx = new RegExp("=", "i");

	var getsplit = url.split("?");
	if(getsplit.length == 2)
		{
		var getparts = getsplit[1].split("&");
		for(gpi in getparts)
			{
			regx.exec(getparts[gpi]);
			obj_get[RegExp.leftContext] = RegExp.rightContext;
			}
		}

	if(bOrigin)
		obj_get.origin = getsplit[0];

	return obj_get;
	}

// Make object of GET parameters to GET string.
self.makeGET = function(obj_get)
	{
	var get = "";
	for(g in obj_get)
		get += (get != "" ? "&" : "") + g + "=" + obj_get[g];

	return (get != "" ? "?" : "") + get;
	}

}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// SPACEIFY UTILITY  // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
function SpaceifyUtility()
{
var self = this;

// base64, source from: http://ntt.cc/2008/01/19/base64-encoder-decoder-with-javascript.html
var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
self.encodeBase64 = function(input)
	{
	var output = "";
	var chr1, chr2, chr3 = "";
	var enc1, enc2, enc3, enc4 = "";
	var i = 0;

	do {
		chr1 = input.charCodeAt(i++);
		chr2 = input.charCodeAt(i++);
		chr3 = input.charCodeAt(i++);

		enc1 = chr1 >> 2;
		enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
		enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
		enc4 = chr3 & 63;

		if(isNaN(chr2))
			enc3 = enc4 = 64;
		else if (isNaN(chr3))
			enc4 = 64;

		output = output + keyStr.charAt(enc1) + keyStr.charAt(enc2) + keyStr.charAt(enc3) + keyStr.charAt(enc4);
		chr1 = chr2 = chr3 = "";
		enc1 = enc2 = enc3 = enc4 = "";
	} while (i < input.length);

	return output;
	}

self.decodeBase64 = function(input)
	{
	var output = "";
	var chr1, chr2, chr3 = "";
	var enc1, enc2, enc3, enc4 = "";
	var i = 0;

	if(!input)
		return "";

	// remove all characters that are not A-Z, a-z, 0-9, +, /, or =
	var base64test = /[^A-Za-z0-9\+\/\=]/g;
	if(base64test.exec(input))
		return -1;

	input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

	do {
		enc1 = keyStr.indexOf(input.charAt(i++));
		enc2 = keyStr.indexOf(input.charAt(i++));
		enc3 = keyStr.indexOf(input.charAt(i++));
		enc4 = keyStr.indexOf(input.charAt(i++));

		chr1 = (enc1 << 2) | (enc2 >> 4);
		chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
		chr3 = ((enc3 & 3) << 6) | enc4;

		output = output + String.fromCharCode(chr1);

		if(enc3 != 64)
			output = output + String.fromCharCode(chr2);
		if(enc4 != 64)
			output = output + String.fromCharCode(chr3);

		chr1 = chr2 = chr3 = "";
		enc1 = enc2 = enc3 = enc4 = "";
	} while (i < input.length);

	return unescape(output);
	}

// cookies
self.setCookie = function(cname, cvalue, expiration_sec)
	{
	var expires = "";

	if(expiration_sec)
		{
		var dn = Date.now() + (expiration_sec * 1000);
		var dc = new Date(dn);
		expires = "expires=" + dc.toGMTString();
		}

	document.cookie = cname + "=" + cvalue + (expires != "" ? "; " + expires : "");
	}

self.deleteCookie = function(cname)
	{
	document.cookie = cname + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
	}

self.getCookie = function(cname)
	{
	var name = cname + "=";
	var ca = document.cookie.split(";");
	for(var i=0; i<ca.length; i++)
		{
		var c = ca[i];
		while(c.charAt(0) == " ")
			c = c.substring(1);

        if(c.indexOf(name) != -1)
			return c.substring(name.length, c.length);
		}

    return "";
	}

// Get a service from services array. 
self.getService = function(services, service_name)
	{
	for(var i=0; i<services.length; i++)
		{
		if(services[i].service_name == service_name)
			return services[i];
		}

	return null;
	}

// Get services from services array. 
self.getServices = function(services, service_names)
	{
	var rservices = new Array(service_names.length);

	for(var i=0; i<services.length; i++)
		{
		for(var j=0; j<service_names.length; j++)
			{
			if(services[i].service_name == service_names[j])
				rservices[j] = services[i];
			}
		}

	return rservices;
	}

self.makeErrorString = function(err)
	{
	var errstr = "";

	if(typeof err == "string")
		errstr = err;
	else if(!err)
		errstr = "";
	else
		{
		if(err.message)
			errstr = err.message;
		else if(err.messages)
			{
			for(var i=0; i<err.messages.length; i++)
				errstr += (errstr != "" ? " - " : "") + err.messages[i];
			}
		}

	return errstr;
	}

// Combine result array errors as an single error array - result = [{err: .., data: ..}, {err: ..., data: ...}, ...]
self.combineResultErrors = function(results)
	{
	var result;
	var code, codes = [];
	var path, paths = [];
	var message, messages = [];

	for(var i=0; i<results.length; i++)																	// Multiple result object which can contain an err object
		{
		if(!(result = results[i].err)) continue;

		for(var j=0; j<result.messages.length; j++)														// 
			{
			code = (result.codes && result.codes[j] ? result.codes[j] : "");
			path = (result.paths && result.paths[j] ? result.paths[j] : "");
			message = (result.messages && result.messages[j] ? result.messages[j] : "");

			codes.push(code);
			paths.push(path);
			messages.push(message);
			}
		}

	for(var i=0; i<messages.length; i++)																// Make a simple error string of the error arrays
		{
		code = (codes[i] ? "(" + codes[i] + ") " : "");

		message += (message != "" ? ", " : "") + code + messages[i];
		}

	return {codes: codes, paths: paths, messages: messages, message: message};
	}

}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// SPACEIFY RPC CLIENT  // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
function SpaceifyRPC()
{
var self = this;

var rpc = null;

self.open = function(service/*must have {port, ip, service_name}*/, forceSecure, callback)
	{
	rpc = new RPC();

	rpc.connect({hostname: EDGE_HOSTNAME, port: $SN.getCorePort(forceSecure), forceSecure: forceSecure, persistent: true}, function(err, data)
		{
		if(err)
			callback(err, null);
		else
			rpc.call("connectTo", [service, (!$SN.isSecure() && !forceSecure ? false : true)], self, function(err, data)
				{
				callback(err ? err : null, !err ? self : null);
				});
		});
	}

self.close = function()
	{
	rpc.close();
	}

self.call = function(method, parameters, obj, callback)
	{
	rpc.call(method, parameters, obj, callback);
	}

self.exposeMethod = function(name, object, method)
	{
	rpc.exposeMethod(name, object, method);
	}

self.connectionListener = function(callback)
	{
	rpc.connectionListener(callback);
	}

self.openCall = function(service, forceSecure, method, parameters, callback)
	{ // A quicker/simpler way to open a connection, call one method and close the connection
	new SpaceifyRPC().open(service, forceSecure, function(err, rpc)
		{
		if(err)
			callback(err, null);
		else
			rpc.call(method, parameters, self, function(err, data)
				{
				rpc.close();
				callback(err ? err : null, err ? null : data);
				});
		});
	}

}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// SPACEIFY REQUEST  // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
function SpaceifyRequest()
{
var self = this;

self.GET = function(url, callback, rtype)
	{
console.log(url);
	var xmlhttp = createXMLHTTP();
	xmlhttp.onreadystatechange = function() { onReadyState(xmlhttp, callback); };
	xmlhttp.open("GET", url, true);
	xmlhttp.responseType = (rtype ? rtype : "");
	xmlhttp.send();
	}

self.POST = function(url, post, callback, rtype)
	{
	var sBoundary = "---------------------------" + Date.now().toString(16);
	var ssBoundary = "--" + sBoundary + "\r\n";
	var seBoundary = "\r\n--" + sBoundary + "--\r\n";

	var content = "";
	for(var i=0; i<post.length; i++)
		{
		if(!post[i].filename)																	// post.data contains a string
			content += ssBoundary + 'Content-Disposition: form-data; name="' + post[i].name + '"\r\n\r\n' + post[i].data + "\r\n";
		else																					// post.data contains an array of values having values [0,255]
			{
			content += 'Content-Disposition: form-data; name="' + post[i].name + ';  filename="' + post[i].filename + '"\r\n';
			content += 'Content-Type: "application/octet-stream"\r\n';
			content += "Content-Transfer-Encoding: binary\r\n\r\n"

			for(var j=0; j<post[i].data.length; j++)
				content += String.fromCharCode(post[i].data[j]);
			}
		}
	content += "\r\n--" + sBoundary + "--\r\n"

	var xmlhttp = createXMLHTTP();
	xmlhttp.onreadystatechange = function() { onReadyState(xmlhttp, callback); };
	xmlhttp.open("POST", url, true);
	xmlhttp.responseType = (rtype ? rtype : "");
	xmlhttp.setRequestHeader("Content-Type", "multipart\/form-data; boundary=" + sBoundary);
	xmlhttp.setRequestHeader("Content-Length", content.length);
	xmlhttp.send(content);
	}

var createXMLHTTP = function()
	{
	return (window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP"));		// IE7+, Firefox, Chrome, Opera, Safari : IE6, IE5
	}

var onReadyState = function(xmlhttp, callback)
	{
	if(xmlhttp.readyState == 4)
		callback(xmlhttp.status != 200 ? xmlhttp.status : null, xmlhttp.status == 200 ? xmlhttp.response : null);
	}

self.loadImage = function(img_id, context, src, unique_name, callback)
	{
	self.loadResources([{ context: context, id: img_id, src: src }], unique_name, function()
		{
		if(typeof callback == "function")
			callback();
		});
	}

var skip_parameters = ["createtag", "context", "src", "href"];
self.loadResources = function(tags, unique_name, callback)
	{ // Create a tag if its not created and load resource or load resource to an existing tag
	var tag = null;

	if(tags.length == 0 && typeof callback == "function")									// All tags processed, return to caller
		return callback();
	else if(tags.length == 0)
		return;

	var ctag = tags.shift();																// Get next tag

	if(ctag.createtag)																		// Create the tag and add parameters to it
		{
		tag = document.createElement(ctag.createtag);
		for(i in ctag)
			{
			if(skip_parameters.indexOf(i.toLowerCase()) == -1)
				tag.setAttribute(i, ctag[i]);
			}
		}
	else if(ctag.id)																		// Get an existing tag
		tag = ctag.context.getElementById(ctag.id);

	if(!tag)																				// Couldn't create or get the tag, ignore and proceed to next tag
		self.loadResources(tags, unique_name, callback);
	else																					// Tag was created succesfully
		{
		tag.onload = function()																	// Process next tag when onload is fired
			{
			tag.onload = null;
			self.loadResources(tags, unique_name, callback);										
			}

		if(ctag.createtag)																		// Append only created tags
			ctag.context.appendChild(tag);

		self.makeURL(ctag.src ? ctag.src : ctag.href, unique_name, function(err, data)			// Load the resource
			{
			self.GET(data, function(err, data)
				{
				if(!err)
					tag[ctag.src ? "src" : "href"] = window.URL.createObjectURL(data);
				}, "blob");
			});
		}
	}

// Get URL for an application.
self.makeURL = function(src, unique_name, callback)
	{
	src = (src.search(/^\//) != -1 ? "" : "/") + src;
	var app_url = $SN.getEdgeURL() + "/404.html";
	var methods = [ "getServices", "getManifest" ];
	var params = [ [[{service_name: "http", unique_name: unique_name}, {service_name: "https", unique_name: unique_name}]], [unique_name] ];

	if(unique_name == -1)																								// Use cores web server
		callback(null, $SN.getEdgeURL() + src);
	else
		{
		$SC.callMultiple(methods, params, function(results)
			{
			if(results instanceof Array)
				{			
				var bSecure = $SN.isSecure();

				var ports = (results[0].err ? null : results[0].data);
				var http_port = (!ports || ports[0].err ? null : ports[0].data.port);
				var https_port = (!ports || ports[1].err ? null : ports[1].data.port);
				var is_running = (!ports || ports[0].err ? false : ports[1].data.is_running);

				var manifest = (results[1].err ? null : results[1].data);
				var bImplements = (manifest && manifest.implements && manifest.implements.indexOf($S.getConfig("WEB_SERVER")) != -1 ? true : false);

				if(bImplements && http_port && https_port && is_running)												// Use applications internal server
					app_url = $SN.getEdgeURL() + ":" + (!bSecure ? http_port : https_port) + src;
				else if(manifest)																						// Use cores web server to get application data using manifes
					{
					var obj_get = $SN.parseGET(src, false);
					obj_get["app"] = manifest.unique_name;
					obj_get["type"] = manifest.type;
					app_url = $SN.getEdgeURL() + src + $SN.makeGET(obj_get);
					}
				else																									// Use cores web server by default
					app_url = $SN.getEdgeURL() + src;
				}

			callback(null, app_url);
			});
		}
	}

}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// INSTANCES AND ALIASES   // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
var spaceifyCore = new SpaceifyCore();
var spaceifyNetwork = new SpaceifyNetwork();
var spaceifyUtility = new SpaceifyUtility();
var spaceifyRequest = new SpaceifyRequest();
var $SC = spaceifyCore;
var $SN = spaceifyNetwork;
var $SU = spaceifyUtility;
var $SR = spaceifyRequest;
