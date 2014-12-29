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
var socket = { "readyState": "closed" };
var callbacks = new Object();
var rpcMethods = new Object();
var logger = new Logger();
var closeEventCallback = null;
var uri = "";

// The callback is a standard node-type callback with error as its first parameter
self.connect = function(opts, callback)
	{
	options.hostname = opts.hostname || EDGE_HOSTNAME;
	options.port = opts.port || CORE_PORT;
	options.forceSecure = opts.forceSecure || false;
	options.persistent = opts.persistent || false;						// Reduce overhead by keeping connection open between calls

	uri = (!spaceifyNetwork.isSecure() && !options.forceSecure ? "ws" : "wss") + "://" + options.hostname + ":" + options.port + "/" + "json-rpc";

	logger.info("Connecting to " + uri);
	socket = eio.Socket(uri, {transports: ['websocket', 'polling']});

	socket.on('open', function()										// Fired upon successful connection.
		{
		callback(null, true);
		});

	socket.on('close', function()										// Fired upon disconnection.
		{
		logger.info("Disconnected from " + uri);

		if(typeof closeEventCallback == "function")
			{
			closeEventCallback(true);
			closeEventCallback = null;
			}

		callbacks = new Object();
		rpcMethods = new Object();
		});

	socket.on('error', function()										// Fired when an error occurs.
		{
		self.close();

		if(typeof callback == "function")
			callback({"code": E_NO_CONNECTION_CODE, "message": E_NO_CONNECTION + options.hostname + ":" + options.port + ", subprotocol: " +  "json-rpc"}, null);
		});

	socket.on('message', function(message)								// Fired when data is received from the server.
		{
		onMessage(message);
		});
	}

self.close = function()
	{
	closeEventCallback = null;

	if(socket.readyState == "open")
		socket.close();
	}

self.setCloseEventListener = function(callback)
	{
	closeEventCallback = (typeof callback == "function" ? callback : null);
	}

self.exposeRPCMethod = function(name, object_, method_)
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
			callObject = {"jsonrpc": "2.0", "method": methods[i], "params": params[i], "id": callSequence};
			callbacks[callSequence] = {"object": object, "listener": listener};
			callSequence++;
		}
		else																		// notification: doesn't expect a response object
			callObject = {"jsonrpc": "2.0", "method": methods[i], "params": params[i], "id": null};

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
		sendMessage({"jsonrpc": "2.0", "error": {"code": -32700, "message": "Invalid JSON."}, "id": null});
		return;
		}

	if(!(reqa instanceof Array))
		reqa = [reqa];
	else
		isBatch = true;

	if(reqa[0].method) // ..............................................Received an external RPC Call
		{
		for(var r = 0; r <  reqa.length; r++)
			{
			if(!reqa[r].jsonrpc || reqa[r].jsonrpc != "2.0" || !reqa[r].method)				// Invalid JSON-RPC
				{
				rspa.push({"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid JSON-RPC."}, "id": null});
				continue;
				}

			if(!rpcMethods.hasOwnProperty(reqa[r].method))									// Unknown method
				{
				if(reqa[r].id != null)
					rspa.push({"jsonrpc": "2.0", "error": {"code": -32601, "message": "Method " + reqa[r].method + " not found."}, "id": reqa[r].id});
				continue;
				}

			try	{																			// Call the method rpcMethod[0] of object rpcMethod[0]
				var rpcMethod = rpcMethods[reqa[r].method];
				var result = rpcMethod.method.apply(rpcMethod.object, reqa[r].params);
				if(reqa[r].id != null)
					rspa.push({"jsonrpc": "2.0", "result": result, "id": reqa[r].id});
				}
		catch(err)
			{
			if(reqa[r].id != null)
				rspa.push({"jsonrpc": "2.0", "error": err, "id": reqa[r].id});
			}
		}

		if(isBatch && rspa.length > 0)
			sendMessage(rspa);
		else if(!isBatch && rspa.length > 0)
			sendMessage(rspa[0]);
		}
	else // ............................................................Returns from an internal RPC call
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

}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// SPACEIFY CORE  // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
function SpaceifyCore()
{
var self = this;

self.startSpacelet = function(unique_name, service_name, forceSecure, callback)
	{
	connect("startSpacelet", [unique_name], forceSecure, function(err, data)
		{
		if(err)
			callback(err, null);
		else
			{
			spaceifyService.storeServices(data);													// Store returned services for later use

			var service = spaceifyService.getService(service_name);
			if(service)																				// Try to connect to the the requested service
				var srpc = new SpaceifyRPC(service, forceSecure, function(err, data) { callback(err ? err : null, err ? null : srpc); });
			else if(!service && service_name)														// Return error if service name was not in the spacelets services
				callback({"message": "Requested service " + service_name + " is not defined in the services of the spacelet " + unique_name}, null);
			else																					// Return nothing if only starting the spacelet was requested
				callback(null, null);
			}
		});
	}

self.findService = function(service_name, callback)
	{
	connect("findService", [service_name], false, callback);
	}

self.adminLogIn = function(password, callback)
	{
	connect("adminLogIn", [password], true, callback);
	}

self.adminLogOut = function(session_id, callback)
	{
	connect("adminLogOut", [session_id], true, callback);
	}

self.isAdminAuthenticated = function(session_id, callback)
	{
	connect("isAdminAuthenticated", [session_id], true, callback);
	}

self.getApplicationData = function(unique_name, callback)
	{
	connect("getApplicationData", [unique_name], false, callback);
	}

self.applyOptions = function(session_id, unique_name, directory, filename, data, callback)
	{
	connect("applyOptions", [session_id, unique_name, directory, filename, data], true, callback);
	}

self.saveOptions = function(session_id, unique_name, directory, filename, data, callback)
	{
	connect("saveOptions", [session_id, unique_name, directory, filename, data], true, callback);
	}

self.loadOptions = function(session_id, unique_name, directory, filename, callback)
	{
	connect("loadOptions", [session_id, unique_name, directory, filename], true, callback);
	}

self.setSplashAccepted = function(callback)
	{
	connect("setSplashAccepted", [], false, callback);
	}

var connect = function(method, params, forceSecure, callback)
	{
	var rpc = new RPC();

	rpc.connect({"hostname": EDGE_HOSTNAME, "port": (!spaceifyNetwork.isSecure() && !forceSecure ? CORE_PORT : CORE_PORT_SECURE), "forceSecure": forceSecure, "persistent": false}, function(err, data)
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
// SPACEIFY SERVICES // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
function SpaceifyService()
{
var self = this;
var services = {};

// Every time services are discovered store them for later use. 
self.storeServices = function(newservices)
	{
	var unique_name = newservices[0].unique_name;
	services[unique_name] = [];
	for(var i=0; i<newservices.length; i++)
		{
		delete newservices[i].registered;
		delete newservices[i].unique_name;
		services[unique_name].push(newservices[i]);
		}
	}

// Get a service stored in the services array. Get either by service name or service name and unique_name.
self.getService = function(service_name, unique_name)
	{
	for(un in services)
		{
		for(var j=0; j<services[un].length; j++)
			{
			if((!unique_name && services[un][j].service_name == service_name) || (unique_name && unique_name == un && services[un][j].service_name == service_name))
				return services[un][j];
			}
		}

	return null;
	}

// Get the http service of an application
self.getHttpService = function(unique_name)
	{
	return self.getService("client_http_server", unique_name);
	}

// Get the https service of an application
self.getHttpsService = function(unique_name)
	{
	return self.getService("client_https_server", unique_name);
	}

// Pass a service array and find service from it
self.findService = function(servicearr, service_name)
	{
	for(var i=0; i<servicearr.length; i++)
		{
		if(servicearr[i].service_name == service_name)
			return servicearr[i];
		}

	return null;
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

// Get the Spaceify Core web server URL
self.getCoreWebServerURL = function()
	{
	return location.protocol + "//" + EDGE_HOSTNAME + ":" + (!self.isSecure() ? CORE_PORT_HTTP : CORE_PORT_HTTPS);
	}

// Get an applications internal web server URL
self.getApplicationWebServerURL = function(unique_name)
	{
	var service = (!self.isSecure() ? spaceifyService.getHttpService(unique_name) : spaceifyService.getHttpsService(unique_name));

	if(!service || !service.port)
		return "";

	return location.protocol + "//" + EDGE_HOSTNAME + ":" + service.port;
	}

// Give http and/or https ports as parameters and make an URL for the application.
self.makeApplicationURL = function(ports)
	{
	if(!ports || (ports && !self.isSecure() && !ports.http_port) || (ports && self.isSecure() && !ports.https_port))	// No suitable port provided
		return null;

	return app_url = self.getEdgeURL() + ":" + (!self.isSecure() ? ports.http_port : ports.https_port);
	}

// Get applications web servers port. Return http or https port automatically if port type is not defined.
self.getApplicationWebServerPort = function(unique_name, bHttps)
	{
	var service = null;
	if(typeof bHttps == "undefined")
		service = (!self.isSecure() ? spaceifyService.getHttpService(unique_name) : spaceifyService.getHttpsService(unique_name));
	else
		service = (!bHttps ? spaceifyService.getHttpService(unique_name) : spaceifyService.getHttpsService(unique_name));

	return (!service || !service.port ? "" : service.port);
	}

// Parse GET from the url. Add origin part of the url to the returned object if requested.
self.parseGET = function(url, bOrigin)
	{
	var uget = {};
	var regx = new RegExp("=", "i");

	var getsplit = url.split("?");
	if(getsplit.length == 2)
		{
		var getparts = getsplit[1].split("&");
		for(gpi in getparts)
			{
			regx.exec(getparts[gpi]);
			uget[RegExp.leftContext] = RegExp.rightContext;
			}
		}

	if(bOrigin)
		uget.origin = getsplit[0];

	return uget;
	}

// Return true if current web page is encrypted
self.isSecure = function()
	{
	return (location.protocol == "http:" ? false : true);
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
self.setCookie = function(cname, cvalue, expms)
	{
	var expires = "";

	if(expms)
		{
		var dn = Date.now() + expms;
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
	var ca = document.cookie.split(';');
	for(var i=0; i<ca.length; i++)
		{
		var c = ca[i];
		while(c.charAt(0) == ' ')
			c = c.substring(1);

        if(c.indexOf(name) != -1)
			return c.substring(name.length, c.length);
		}

    return "";
	}

}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// SPACEIFY RPC CLIENT  // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
function SpaceifyRPC(hostdata/*must have {port, ip, service_name}*/, forceSecure, connectionCallback)
{
var self = this;

var rpc = new RPC();

rpc.connect({"hostname": EDGE_HOSTNAME, "port": (!spaceifyNetwork.isSecure() && !forceSecure ? CORE_PORT : CORE_PORT_SECURE), "forceSecure": forceSecure, "persistent": true}, function(err, data)
	{
	if(err)
		connectionCallback(err, null);
	else
		rpc.call("connectTo", [hostdata, (!spaceifyNetwork.isSecure() && !forceSecure ? false : true)], self, connectionCallback);
	});

self.close = function()
	{
	rpc.close();
	}

self.call = function(message, parameters, obj, callback)
	{
	rpc.call(message, parameters, obj, callback);
	}

self.exposeRPCMethod = function(name, object, method)
	{
	rpc.exposeRPCMethod(name, object, method);
	}

self.setCloseEventListener = function(callback)
	{
	rpc.setCloseEventListener(callback);
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

self.loadImage = function(img, src, callback)
	{
	self.GET(src, function(err, data)
		{
		if(!err)
			{
			img.onload = null;
			img.src = window.URL.createObjectURL(data);
			}

		if(typeof callback == "function")
			callback(err ? err : null, err ? null : true);

		}, "blob");
	}

var skip_parameters = ["createtag", "context", "src", "href"];
self.loadResources = function(tags, callback)
	{ // Create a tag if its not created and load resource or load resource to an existing tag
	var tag = null;

	if(tags.length == 0)																	// All tags created, return to caller
		return (typeof callback == "function" ? callback() : true);

	ctag = tags.shift();																	// Get next tag

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

	if(!tag)																				// Couldn't create or get the tag
		self.loadResources(tags, callback);
	else
		{
		tag.onload = function()																// Process next tag when onload is fired
			{
			tag.onload = null;
			self.loadResources(tags, callback);										
			}

		if(ctag.createtag)																	// Append only created tags
			ctag.context.appendChild(tag);

		self.GET(ctag.src ? ctag.src : ctag.href, function(err, data)						// Load the resource
			{
			if(!err)
				tag[ctag.src ? "src" : "href"] = window.URL.createObjectURL(data);
			}, "blob");
		}
	}

}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// INSTANCES AND ALIASES FOR THEM   // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
var spaceifyCore = new SpaceifyCore();
var spaceifyService = new SpaceifyService();
var spaceifyNetwork = new SpaceifyNetwork();
var spaceifyUtility = new SpaceifyUtility();
var spaceifyRequest = new SpaceifyRequest();
var $SC = spaceifyCore;
var $SS = spaceifyService;
var $SN = spaceifyNetwork;
var $SU = spaceifyUtility;
var $SR = spaceifyRequest;
