"use strict";

/**
 * RpcCommunicator, 21.6.2016 Spaceify Oy
 *
 * A class that implements the JSON-RPC 2.0 protocol supporting single, batch and notification requests.
 * Communicates with the outside world with WebSocketConnection or WebRTCConnection objects
 * on the layer below. This is a two-way class that implements both client and server functionality.
 *
 * class @RpcCommunicator
 */

function RpcCommunicator()
{
// NODE.JS / REAL SPACEIFY - - - - - - - - - - - - - - - - - - - -
var isNodeJs = (typeof exports !== "undefined" ? true : false);
var isRealSpaceify = (typeof process !== "undefined" ? process.env.IS_REAL_SPACEIFY : false);
var isApplication = (typeof process !== "undefined" && process.env.IS_REAL_SPACEIFY ? false : true);
var apiPath = (isNodeJs && isRealSpaceify ? "/api/" : "/var/lib/spaceify/code/");

var classes = 	{
				Logger: (isNodeJs ? require(apiPath + "logger") : Logger),
				SpaceifyError: (isNodeJs ? require(apiPath + "spaceifyerror") : SpaceifyError),
				SpaceifyUtility: (isNodeJs ? require(apiPath + "spaceifyutility") : SpaceifyUtility),
				CallbackBuffer: (isNodeJs ? require(apiPath + "callbackbuffer") : CallbackBuffer)
				};

var fibrous = (isNodeJs ? require("fibrous") : function(fn) { return fn; });
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

var self = this;

var logger = new classes.Logger();
var errorc = new classes.SpaceifyError();
var utility = new classes.SpaceifyUtility();
var callbackBuffer = new classes.CallbackBuffer();

var callSequence = 1;
var exposedRpcMethods = {};

var eventListener = null;
var binaryListener = null;
var connectionListeners = [];
var disconnectionListeners = [];

var connections = {};
var latestConnectionId = null;

var options = { debug: true };

//** Upwards interface towards business logic

self.exposeRpcMethod = function(name, object, method)
	{
	try	{
		exposedRpcMethods[name] = {object: object, method: method};
		}
	catch(err)
		{
		logger.error(err, true, true, logger.ERROR);
		}
	};

self.setConnectionListener = function(listener)
	{
	if(typeof listener == "function")
		connectionListeners.push(listener);
	};

self.setDisconnectionListener = function(listener)
	{
	if(typeof listener == "function")
		disconnectionListeners.push(listener);
	};

self.setBinaryListener = function(listener)
	{
	binaryListener = (typeof listener == "function" ? listener : null);
	};

self.connectionExists = function(connectionId)
	{
	if (typeof connectionId !== "undefined" && connections.hasOwnProperty(connectionId) )
		return true;
	else if (typeof connectionId === "undefined" && connections.hasOwnProperty(latestConnectionId))
		return true;
	else
		return false;
	};

self.getConnection = function(connectionId)
	{
	return connections[connectionId];
	};

self.setOptions = function(opts)
	{
	options.debug = ("debug" in opts ? opts.debug : false);

	logger.setOptions({output: options.debug});
	}

// Outgoing RPC call

self.callRpc = function(methods, params, object, callback, connectionId)
	{
	var callObject;
	var callObjects = [];
	var isBatch = false, currentId;
	var id = (typeof connectionId != "undefined" ? connectionId : latestConnectionId);		// Assume there is only one connection

	logger.info("RpcCommunicator::callRpc() connectionId: " + connectionId);

	if (!self.connectionExists(connectionId))
		return;

	try	{
		if(!(methods instanceof Array))														// Process single request as "a single batch request"
			{
			isBatch = false;
			params = [params];
			methods = [methods];
			}

		currentId = callSequence;															// Batch requests have only one callback and the id in
																							// the callbackBuffer is the id of the first request
		for(var i=0; i<methods.length; i++)
			{
			if (typeof callback == "function")												// Call: expects a response object
				callObject = {jsonrpc: "2.0", method: methods[i], params: params[i], id: callSequence++};
			else																			// Notification: doesn't expect a response object
				callObject = {jsonrpc: "2.0", method: methods[i], params: params[i]};

			callObjects.push(callObject);

			logger.info("  " + JSON.stringify(callObject));
			}

		if(typeof callback == "function")
			callbackBuffer.pushBack(currentId, object, callback);
		}
	catch(err)
		{
		return (typeof callback == "function" ? callback(errorc.makeErrorObject(-32000, "callRpc failed.", "RpcCommunicator::callRpc"), null) : false);
		}

	sendMessage(isBatch ? callObjects : callObjects[0], id);								// Send as batch only if call was originally batch
	};

// Sends a RPC notification to all connections
self.notifyAll = function(method, params)
	{
	try	{
		for (var key in connections)
			{
			logger.info("RpcCommunicator::notifyAll() sending message to " + key);

			sendMessage({"jsonrpc": "2.0", "method": method, "params": params, "id": null}, key);
			}
		}
	catch(err)
		{
		logger.error(err, true, true, logger.ERROR);
		}
	};

self.getBufferedAmount = function(connectionId)
	{
	return connections[connectionId].getBufferedAmount();
	};

self.sendBinary = function(data, connectionId)
	{
	logger.info("RPCCommunicator::sendBinary() " + data.byteLength);

	try	{
		connections[connectionId].sendBinary(data);
		}
	catch(err)
		{
		logger.error(err, true, true, logger.ERROR);
		}
	};

//** Private methods

var sendBinaryCall = function(callId, method, params, connectionId)
	{
	var messageBuffer = new ArrayBuffer(8+4+callId.length+4+method.length+8+params.byteLength);
	var view = new DataView(messageBuffer);
	var messageArray = new Uint8Array(messageBuffer);

	view.setUint32(4, messageBuffer.byteLength-8);
	view.setUint32(8, callId.length);
	view.setUint32(8+4+callId.length, method.length);

	//messageArray.subarray(8+4, 8+4+4+callId.length).set(params);
	//messageArray.subarray(8+4+callId.length+4+method.length+8, messageBuffer.byteLength).set(params);

	messageArray.subarray(8+4+callId.length+4+method.length+8, messageBuffer.byteLength).set(params);
	};

var sendMessage = function(message, connectionId)
	{
	try	{
		connections[connectionId].send(JSON.stringify(message));
		}
	catch(err)
		{
		logger.error(err, true, true, logger.ERROR);
		}
	};
self.sendMessage = sendMessage;	//for testing, remove this later

// Send the return value of the RPC call to the caller
var sendResponse = function(err, result, id, connectionId)
	{
	try	{
		if (err)
			{
			logger.error(["Exception in executing a RPC method.", err], true, true, logger.ERROR);

			sendMessage({"jsonrpc": "2.0", "error": err, "id": id});
			}
		else
			sendMessage({"jsonrpc": "2.0", "result": result, "id": id}, connectionId);
		}
	catch(err)
		{
		logger.error(err, true, true, logger.ERROR);
		}
	};

var handleMessage = function(requestsOrResponses, connectionId)
	{
	var isBatch = true;

	try	{
		if(!(requestsOrResponses instanceof Array))										// Process single request/response as "a single batch request/response"
			{ requestsOrResponses = [requestsOrResponses]; isBatch = false; }

		if (requestsOrResponses[0].method)												// Received a RPC Call from outside
			{
			if(isNodeJs)
				fibrous.run( function()
				{
				handleRPCCall.sync(requestsOrResponses, isBatch, connectionId);
				}, function(err, data) { } );
			else
				handleRPCCall(requestsOrResponses, isBatch, connectionId);
			}
		else																			// Received a return value(s) to an RPC call made by us
			handleReturnValue(requestsOrResponses, isBatch);
		}
	catch(err)
		{
		logger.error(err, true, true, logger.ERROR);
		}
	};

var handleRPCCall = function(requests, isBatch, connectionId)
	{
	logger.info("RpcCommunicator::handleRpcCall() connectionId: " + connectionId);

	var responses = [], result, r, onlyNotifications = true;

	for(r = 0; r < requests.length; r++)
		{
		var requestId = (requests[r].hasOwnProperty("id") ? requests[r].id : null);
		var rpcParams = (requests[r].hasOwnProperty("params") ? requests[r].params : []);

		if(requestId != null)
			onlyNotifications = false;

		logger.info((requestId ? "  REQUEST -> " : "  NOTIFICATION -> ") + JSON.stringify(requests[r]));

		if (!requests[r].jsonrpc || requests[r].jsonrpc != "2.0" || !requests[r].method)	// Invalid JSON-RPC
			{
			responses.push({"jsonrpc": "2.0", "error": {"code": -32600, "message": "The JSON sent is not a valid Request object."}, "id": null}, connectionId);
			continue;
			}

		if (rpcParams !== "undefined" && rpcParams.constructor !== Array )
			{
			responses.push({"jsonrpc": "2.0", "error": {"code": -32602, "message": "Invalid method parameter(s). Parameters must be placed inside an array."}, "id": requestId}, connectionId);
			continue;
			}

		if (!exposedRpcMethods.hasOwnProperty(requests[r].method))							// Unknown method
			{
			responses.push({"jsonrpc": "2.0", "error": {"code": -32601, "message": "The method does not exist / is not available: " + requests[r].method + "."}, "id": requestId});
			continue;
			}

		try	{
			var rpcMethod = exposedRpcMethods[requests[r].method];

			rpcParams.push(	{																// Add the connection object as the last parameter
							requestId: requestId,
							connectionId: connectionId,
							origin: connections[connectionId].getOrigin(),
							isSecure: connections[connectionId].getIsSecure(),
							remotePort: connections[connectionId].getRemotePort(),
							remoteAddress: connections[connectionId].getRemoteAddress()
							});

			if(isNodeJs && isApplication)
				result = rpcMethod.method.sync.apply(rpcMethod.object, rpcParams);
			else
				result = rpcMethod.method.apply(rpcMethod.object, rpcParams);

			if(requestId != null)															// Notifications don't and can't send responses
				responses.push({jsonrpc: "2.0", result: (typeof result === "undefined" ? null : result), id: requestId});
			}
		catch(err)
			{
			err = errorc.make(err);															// Make all errors adhere to the SpaceifyError format

			if(requestId != null)
				responses.push({jsonrpc: "2.0", error: err, id: requestId});
			}

		if(requestId != null)
			logger.info("  RESPONSE <- " + JSON.stringify(responses[responses.length - 1]));
		else
			logger.info("  NO RESPONSE SEND FOR NOTIFICATION");
		}

	if(!onlyNotifications && responses.length == 0)
		responses.push({"jsonrpc": "2.0", "error": {"code": -32603, "message": "Internal JSON-RPC error."}, id: null});

	if(responses.length > 0)														// Batch -> [response objects] || Single -> response object
		sendMessage((isBatch ? responses : responses[0]), connectionId);
	};

// Handle incoming return values for a RPC call that we have made previously
var handleReturnValue = function(responses, isBatch)
	{
	logger.info("RpcCommunicator::handleReturnValue()");

	var error = null, result = null;

	try	{
		if(isBatch)
			{
			var processed = processBatchResponse(responses);
			callbackBuffer.callMethodAndPop(processed.smallestId, processed.errors, processed.results);
			}
		else
			{
			logger.info("  RESPONSE: " + JSON.stringify(responses[0]));

			if(!responses[0].jsonrpc || responses[0].jsonrpc != "2.0" || !responses[0].id || (responses[0].result && responses[0].error))
				return;

			if (responses[0].error)
				error = responses[0].error;

			if (responses[0].result)
				result = responses[0].result;

			callbackBuffer.callMethodAndPop(responses[0].id, error, result);
			}
		}
	catch(err)
		{
		logger.error(err, true, true, logger.ERROR);
		}
	};

var processBatchResponse = function(responses)
	{ // Process raw JSON-RPC objects returned by batch JSON-RPC call. Returns an array containing
	  // [{error: .., result: ...}, {error: ..., result: ....}, ...] objects.
	var smallestId = -1;
	var errors = {}, results = {}

	for(var r=0; r<responses.length; r++)
		{
		logger.info("  RESPONSE: " + JSON.stringify(responses[r]));

		if(!responses[r].jsonrpc || responses[r].jsonrpc != "2.0" || !responses[r].id || (responses[r].result && responses[r].error))
			continue;

		smallestId = Math.max(smallestId, responses[r].id);

		if(responses[r].hasOwnProperty("error"))
			{
			errors[responses[r].id] = responses[r].error;
			results[responses[r].id] = null;
			}
		else if(responses[r].hasOwnProperty("result"))
			{
			errors[responses[r].id] = null;
			results[responses[r].id] = results[r].result;
			}
		}

	return {smallestId: smallestId, errors: errors, results: results};
	}

self.setupPipe = function(firstId, secondId)
	{
	logger.info("RpcCommunicator::setupPipe() between: " + firstId + " and " + secondId);

	if (!connections.hasOwnProperty(firstId) || !connections.hasOwnProperty(secondId))
		return;

	connections[firstId].setPipedTo(secondId);
	connections[secondId].setPipedTo(firstId);
	};

//** Downwards interface towards a connection

//** MessageListener interface implementation

self.onMessage = function(messageData, connection)
	{
	//logger.info("RpcCommunicator::onMessage(" + typeof messageData + ") " + messageData);

	try	{
		var pipeTarget = connection.getPipedTo();

		if (pipeTarget != null)
			{
			connections[pipeTarget].send(messageData);

			return;
			}

		if (messageData instanceof ArrayBuffer)
			{
			if (typeof binaryListener == "function")
				binaryListener.onBinary(messageData, connection.getId());

			return;
			}

		// JSON-RPC
		try {
			messageData = JSON.parse(messageData);

			handleMessage(messageData, connection.getId());
			}
		catch (err)
			{
			sendMessage({"jsonrpc": "2.0", "error": {"code": -32700, "message": "Invalid JSON."}, "id": null}, connection.getId());
			}
		}
	catch(err)
		{
		logger.error(err, true, true, logger.ERROR);
		}
	};

//** EventListener interface implementation (events originate from server)

self.addConnection = function(conn)
	{
	try	{
		if (!conn.getId())
			conn.setId(utility.generateRandomConnectionId(connections));	// Use random connectionId to make ddos a little more difficult

		connections[conn.getId()] = conn;
		conn.setEventListener(self);

		for(var i=0; i<connectionListeners.length; i++)						// Bubble the event to client
			connectionListeners[i](conn.getId());

		latestConnectionId = conn.getId();
		return conn.getId();
		}
	catch(err)
		{
		logger.error(err, true, true, logger.ERROR);
		}
	};

self.onDisconnected = function(connectionId)
	{
	try	{
		self.closeConnection(connectionId);

		for(var i=0; i<disconnectionListeners.length; i++)			// Bubble the event to clients
			disconnectionListeners[i](connectionId);
		}
	catch(err)
		{
		logger.error(err, true, true, logger.ERROR);
		}
	};

//** ---------------------------------------

self.closeConnection = function(connectionId)
	{
	try	{
		if (connectionId in connections)
			{
			connections[connectionId].close();
			delete connections[connectionId];
			}
		}
	catch(err)
		{
		logger.error(err, true, true, logger.ERROR);
		}
	};

}

// Do this only in node.js, not in the browser

if (typeof exports !== "undefined")
	{
	module.exports = RpcCommunicator;
	}
