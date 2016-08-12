"use strict";

/**
 * PubSub, 19.5.2014 Spaceify Oy
 * 
 * @class PubSub
 */

var rebus = require("./lib/rebus");

function PubSub()
{
var self = this;

var rbus = null;

self.open = function(directory)
	{
	if(!rbus)
		rbus = rebus(directory, { persistent: false });
	}

self.close = function()
	{
	if(rbus)
		rbus.close();
	rbus = null;
	}

self.subscribe = function(prop, callback)
	{
	if(rbus)
		return rbus.subscribe(prop, callback);
	}

self.unsubscribe = function(notification)
	{
	notification.close();
	}

self.publish = function(prop, obj, path, callback)
	{
	if(path)
		{
		self.close()
		self.open(path);
		}

	rbus.publish(prop, obj, callback);

	if(path)
		self.close();
	}

self.value = function(prop, path)
	{
	var rvalue = null;

	try {
		if(path)
			{
			self.close()
			self.open(path);
			}

		rvalue = (rbus ? rbus.value[prop] : null);

		if(path)
			self.close();
		}
	catch(err)
		{
		}

	return rvalue;
	}

}

module.exports = PubSub;
