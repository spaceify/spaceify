"use strict";

/**
 * Spaceify Synchronous, 29.7.2015 Spaceify Oy
 *
 * @class SpaceifySynchronous
 */

function SpaceifySynchronous()
{
var self = this;

var methodId = 0;
var methods = [];
var results = {};
var waiting = null;
var finally_ = null;

// Start traversing functions in the order they are defined. Functions are executed independently and results are not passed to the next function.
// The results of operations are stored in the results object in the same order as the functions were executed.
self.waterFall = function(_methods, callback)
	{
	if((!_methods || _methods.length == 0) && typeof callback == "function")
		callback(results);
	else if(!_methods || _methods.length == 0 || typeof callback != "function")
		return;

	finally_ = callback;

	methods = _methods;

	next();
	}

// Call the methods one after another recursively
var next = function()
	{
	if(methods.length == 0)
		return finally_();

	var calling = methods.shift();

	// Call a method that is asynchronous. Store the original callback and replace it with ours. It's assumed that
	// the original callback is the last parameter. After our callback returns call the original callback, if it is defined (not null).
	if(calling.type == "async")
		{
		waiting = calling.params[calling.params.length - 1];
		calling.params[calling.params.length - 1] = wait;
		calling.method.apply(calling.object, calling.params);
		}
	// Call a method that is synchronous.
	else
		{
		results[++methodId] = calling.method.apply(calling.object, calling.params);
		next();
		}
	}

var wait = function()
	{
	results[++methodId] = Array.prototype.slice.call(arguments);			// Array of return values rather than the arguments object

	if(typeof waiting == "function")
		waiting.apply(this, arguments);

	next();
	}

self.getResult = function(methodId)
	{
	return (results[methodId] ? results[methodId] : null);
	}

self.getResults = function()
	{
	return results;
	}

}

if(typeof exports !== "undefined")
	module.exports = SpaceifySynchronous;