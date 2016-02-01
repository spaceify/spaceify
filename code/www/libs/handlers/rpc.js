/**
 * RPC by Spaceify Inc. 30.7.2015
 *
 * This class has JSON-RPC 2.0 compliant implementation supporting single, batch and notification requests.
 *
 * Client and server implementations of communicators can be used with this class. The class detects automatically which
 * implementation is used based on passed parameter counts and/or whether argument is a function = client or
 * object = server. The class also detect whether synchronous processing is required by checking is fibrous defined (Node.js program).
 *
 * @class	RPC
 *
 * @param	parent		the parent class of this class
 * @param	connobj		used through this class and is a connection object
 */
function RPC(parent)
{
var self = this;

var callSequence = 1;
var callbacks = new Object();
var rpcMethods = new Object();

var isNodeJs = (typeof exports !== "undefined" ? true : false);

if(isNodeJs)
	{
	var isApplication = process.env.PORT_80;

	var api_path = isApplication ? "/api/" : "/var/lib/spaceify/code/";

	fibrous = require("fibrous");
	logger = require(api_path + "logger");
	}
else
	{
	isApplication = false;
	logger = new Logger();
	}

self.exposeRpcMethod = function(name, object, method)
	{
	rpcMethods[name] = {object: object, method: method};
	}

/**
 * @param	methods
 * @param	params
 * @param	object
 * [@param	connobj		an object passed optionally by server implementations]
 * @param	listener
 */
self.callRpc = function(methods, params, object)
	{
	var callObject;
	var callObjects = [];
	var is_batch = true;
	var connobj_or_id = null, listener;

	try {
		if(arguments.length == 4)														// Calls from client implementations pass only listener in the arguments
			{
			listener = arguments[arguments.length - 1];

			if(!parent.isOpen())														// Clients have only one connection
				throw "";
			}
		else																			// Calls from server implementations pass both connection...
			{																			// ...object and listener in the arguments
			var fibmin = (arguments.length == 6 ? 1 : 0);								// Did fibrous add its callback?

			listener = arguments[arguments.length - 2 - fibmin];
			connobj_or_id = arguments[arguments.length - 1 - fibmin];

			if(!parent.isConnection(connobj_or_id))										// Servers have multiple connections indexed by an identifier
				throw "";
			}

		if(!(methods instanceof Array))
			{
			is_batch = false;
			params = [params];
			methods = [methods];
			}

		for(var i=0; i<methods.length; i++)
			{
			if(typeof listener == "function")											// call: expects a response object
				{
				callObject = {jsonrpc: "2.0", method: methods[i], params: params[i], id: callSequence};
				callbacks[callSequence] = {object: object, listener: listener, ms: Date.now()};
				callSequence++;
				}
			else																		// notification: doesn't expect a response object
				callObject = {jsonrpc: "2.0", method: methods[i], params: params[i], id: null};

			callObjects.push(callObject);
			}
		}
	catch(err)
		{
		return (typeof listener == "function" ? listener({path: "RPC::callRpc", code: "rpc1000", message: "callRpc failed."}, null) : false);
		}

	var ao = is_batch ? callObjects : callObjects[0];									// array of objects or object

	!connobj_or_id ? parent.sendMessage(ao) : parent.sendMessage(ao, connobj_or_id);	// client or server
	}

self.onMessage = function(message)
	{
	var is_server = (arguments.length == 2 ? true : false);

	if(typeof message == "string")
		!is_server ? onRPC(message) : onRPC(message, arguments[1]);
	else if(message instanceof Object)
		{
		if(message.type && message.type == "utf8")
			!is_server ? onRPC(message.utf8Data) : onRPC(message.utf8Data, arguments[1]);
		else if(message.type && message.type == "binary")
			!is_server ? onBinary(message.binaryData) : onBinary(message.binaryData, arguments[1]);
		else
			!is_server ? onUnknown(message) : onUnknown(message, arguments[1]);
        }
	else if(message instanceof ArrayBuffer)
		!is_server ? onBinary(message) : onBinary(message, arguments[1]);
	else
		!is_server ? onUnknown(message) : onUnknown(message, arguments[1]);
	}

var onBinary = function(data)
	{
	if(parent.onBinary)
		parent.onBinary(data);
	}

var onUnknown = function(message)
	{
	
	}

var onRPC = function(message)
	{
	logger.info("onRPC: " + message);

	var is_batch = false;
	var requests_or_responses;

	var connobj_or_parent = (arguments.length == 1 ? parent : arguments[arguments.length - 1]);

	try {
		requests_or_responses = JSON.parse(message);
		}
	catch(err)
		{
		parent.sendMessage({jsonrpc: "2.0", error: {code: -32700, message: "Invalid JSON."}, id: null});

		return;
		}

	if(!(requests_or_responses instanceof Array))										// Process single request the same way as batch requests.
		requests_or_responses = [requests_or_responses];
	else
		is_batch = true;

	if(requests_or_responses[0].method)													// Received request(s)
		{
		if(isNodeJs && !isApplication)
			fibrous.run( function()
			{
			handleRequests(requests_or_responses, is_batch, connobj_or_parent);
			}, function(err, data) { } );
		else
			handleRequests(requests_or_responses, is_batch, connobj_or_parent);
		}
	else																				// Received response(s)
		handleResponses(requests_or_responses, is_batch, connobj_or_parent);		
	}

var handleRequests = function(requests, is_batch, connobj_or_parent)
	{
	var responses = [];

	for(var r = 0; r < requests.length; r++)
		{
		if(typeof connobj_or_parent !== "function")
			connobj_or_parent.rpcId = requests[r].id;

		if(!requests[r].jsonrpc || requests[r].jsonrpc != "2.0" || !requests[r].method)	// Invalid JSON-RPC
			{
			responses.push({jsonrpc: "2.0", error: {code: -32600, message: "Invalid JSON-RPC."}, id: null});
			continue;
			}

		if (Object.prototype.toString.call(requests[r].params) !== "[object Array]" )	
			{
			responses.push({jsonrpc: "2.0", error: {code: -32600, message: "Parameters must be sent inside an array."}, id: requests[r].id});
			continue;
			}

		if(!rpcMethods.hasOwnProperty(requests[r].method))								// Unknown method
			{
			var unknown_result = null;

			if(parent.onUnknownMethod)													// Parent wants to catch the unknown methods
				unknown_result = parent.unknownMethod(requests[r], connobj_or_parent);

			if(requests[r].id != null)
				unknown_result = {jsonrpc: "2.0", error: {code: -32601, message: "Method " + requests[r].method + " not found."}, id: requests[r].id};

			responses.push(unknown_result);

			continue;
			}

		try	{																			// Call the method rpcMethod[0] of object rpcMethod[0]
			var rpcParams = requests[r].params;
			var rpcMethod = rpcMethods[requests[r].method];

			arg_connobj =	{															// Add the connection object as the last parameter.
							origin: connobj_or_parent.origin,
							id: connobj_or_parent.id,
							server_type: connobj_or_parent.server_type,
							remotePort: connobj_or_parent.remotePort,
							remoteAddress: connobj_or_parent.remoteAddress,
							is_secure: connobj_or_parent.is_secure
							};
			rpcParams.push(arg_connobj);

			if(isNodeJs && !isApplication)
				result = rpcMethod.method.sync.apply(rpcMethod.object, rpcParams);
			else
				result = rpcMethod.method.apply(rpcMethod.object, rpcParams);

			if(requests[r].id != null)
				responses.push({jsonrpc: "2.0", result: result, id: requests[r].id});
			}
		catch(err)
			{
			logger.printErrors(err, true, true, 0);

			if(requests[r].id != null)
				responses.push({jsonrpc: "2.0", error: err, id: requests[r].id});
			}
		}

	if(is_batch && responses.length > 0)
		(typeof connobj_or_parent === "function" ? connobj_or_parent.sendMessage(responses) : parent.sendMessage(responses, connobj_or_parent));
	else if(!is_batch && responses.length > 0)
		(typeof connobj_or_parent === "function" ? connobj_or_parent.sendMessage(responses[0]) : parent.sendMessage(responses[0], connobj_or_parent));
	}

var handleResponses = function(responses, is_batch, connobj_or_parent)
	{
	var calledOnce = false;

	for(r in responses)
		{
		if(typeof connobj_or_parent !== "function")
			connobj_or_parent.rpcId = responses[r].id;

		var callback = callbacks[responses[r].id];
		var ms = Date.now() - callback.ms;

		if(!responses[r].id || !callback)
			continue;
		else if(is_batch)																// Batch request gets called only once with all the responses in a response array. Let the caller process the array.
			{
			if(!calledOnce) {
				callback.listener.apply(callback.object, [null, responses, ms, 0, connobj_or_parent]); calledOnce = true; }
			}
		else																			// Single request gets always called only once!!!
			{
			if(typeof responses[r].result != "undefined")
				callback.listener.apply(callback.object, [null, responses[r].result, responses[r].id, ms, connobj_or_parent]);
			else if(typeof responses[r].error != "undefined")
				callback.listener.apply(callback.object, [responses[r].error, null, responses[r].id, ms, connobj_or_parent]);
			else if(!calledOnce)
				callback.listener.apply(callback.object, [null, null, responses[r].id, ms, connobj_or_parent]);
			}

		delete callbacks[responses[r].id];
		}
	}

self.convertBatchCall = function(data)
	{ // Process raw JSON-RPC objects returned by batch JSON-RPC call. Returns an array containing
	  // [{err: .., data: ...}, {err: ..., data: ....}, ...] objects.
	var result = [];
	for(var i=0; i<data.length; i++)
		{
		if(data[i].error)
			result.push({error: data[i].error, result: null});
		else
			result.push({error: null, result: data[i].result});
		}

	return result;
	}

}

if(typeof exports !== "undefined")
	module.exports = RPC;