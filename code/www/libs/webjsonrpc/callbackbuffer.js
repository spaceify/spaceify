"use strict";

/**
 * CallbackBuffer, 12.5.2016 Spaceify Oy
 * 
 * @class CallbackBuffer
 */

function CallbackBuffer(initialListSize)
{
var self = this;

var callbacks = new Object();

self.pushBack = function(id, object, method)
	{
	callbacks[id] = [object, method, Date.now()];
	};

self.callMethodAndPop = function(id, error, result)
	{
	if (callbacks.hasOwnProperty(id))
		{
		(callbacks[id][1]).call(callbacks[id][0], error, result, id, Date.now() - callbacks[id][2]);
		delete callbacks[id];
		}
	else
		throw {error: "CallbackBuffer::callMethodAndPop(). Callback not found"};
	};
}

if (typeof exports !== "undefined")
	{
	module.exports = CallbackBuffer;
	}
