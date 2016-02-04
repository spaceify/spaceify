/**
 * Spaceify Synchronous by Spaceify Inc. 29.7.2015
 *
 * @class SpaceifySynchronous
 */

function SpaceifySynchronous()
{
var self = this;

var method_id = 0;
var methods = [];
var results = {};
var _finally = null;
var waiting = null;

// Setup an arbitrary amount of method calls and start traversing them in the order they are defined.
self.waterFall = function(_methods, callback)
	{
	if((!_methods || _methods.length == 0) && typeof callback == "function")
		callback(results);
	else if(!_methods || _methods.length == 0 || typeof callback != "function")
		return;

	_finally = callback;

	methods = _methods;

	next();
	}

// Call the methods one after other recursively when previous call has returned.
var next = function()
	{
	if(methods.length == 0)
		return _finally();

	var calling = methods.shift();

	// Call a method that has a callback. Store the original callback and replace it with ours. It's assumed that
	// the original callback is the last parameter. After our callback returns call the original callback.
	if(calling.type == "sync")
		{
		waiting = calling.params[calling.params.length - 1];
		calling.params[calling.params.length - 1] = wait;
		calling.method.apply(calling.object, calling.params);
		}
	// Call a method that doesn't have callback processing inside it.
	else
		{
		results[++method_id] = calling.method.apply(calling.object, calling.params);
		next();
		}
	}

var wait = function()
	{
	results[++method_id] = arguments;
	waiting.apply(this, arguments);
	next();
	}

self.getResult = function(mid)
	{
	return (results[mid] ? results[mid] : null);
	}

}