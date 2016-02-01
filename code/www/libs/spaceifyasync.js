/**
 * Spaceify Async by Spaceify Inc. 29.7.2015
 *
 * @class SpaceifyAsync
 */

function SpaceifyAsync()
{
var self = this;

var method_id = 0;
var methods = [];
var results = {};
var originals = {};
var _finally = null;

// Setup an arbitrary amount of method calls and start traversing them in the order they are defined.
self.waterFall = function(_methods, callback)
	{
	if((!_methods || _methods.length == 0) && typeof callback == "function")
		callback(results);
	else if(!_methods || _methods.length == 0 || typeof callback != "function")
		return;

	_finally = callback;

	for(i=0; i<_methods.length; i++)
		methods.push(_methods[i]);

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
	if(calling.type == "async")
		{
		originals[++method_id] = calling.params[calling.params.length - 1];				// Store the original callback
		calling.params[calling.params.length - 1] = new Function(method_id)					// Replace with our callback
			{
			function finish()
				{
				// ToDo: should the array-like arguments be converted to an array to make apply more compatible
				originals[method_id].apply(calling.owner, arguments);						// Call the original after our method has returned
				delete originals[method_id];

				results[method_id] = arguments;												// Store the result if somebody wants to get them after waterfall finishes

				next();																		// Move on to processing the next method
				}

			finish();
			}

		calling.method.apply(calling.owner, calling.params);
		}
	// Call a method that doesn't have callback processing inside it.
	else
		{
		results[++method_id] = calling.method.apply(calling.owner, calling.params);
		next();
		}
	}

self.getResult = function(mid)
	{
	return (results[mid] ? results[mid] : null);
	}

}
