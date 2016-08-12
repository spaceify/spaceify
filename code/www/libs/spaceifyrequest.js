"use strict";

/**
 * Spaceify Request, 29.7.2015 Spaceify Oy
 *
 * @class SpaceifyRequest
 */

function SpaceifyRequest()
{
var self = this;

var addTags = [];
var core = new SpaceifyCore();
var network = new SpaceifyNetwork();

	// DOM -- -- -- -- -- -- -- -- -- -- //
self.head = function(wnd)
	{
	return (wnd.document.getElementsByTagName("head")[0] || wnd.document.documentElement);
	}

	// METHODS -- -- -- -- -- -- -- -- -- -- //
self.loadImage = function(src, id, context, unique_name, callback)
	{
	if(typeof callback == "function")
		loadResources([{ src: src, id: id, context: context, unique_name: unique_name }], function() { callback(); });
	else
		addTags.push({ src: src, id: id, context: context, unique_name: unique_name });

	return self;
	}

self.loadCSS = function(href, id, context, unique_name, callback)
	{
	if(typeof callback == "function")
		loadResources([{ href: href, id: id, context: context, unique_name: unique_name }], function() { callback(); });
	else
		addTags.push({ href: href, id: id, context: context, unique_name: unique_name });

	return self;
	}

self.loadJS = function(src, id, context, unique_name)
	{
	if(typeof callback == "function")
		loadResources([{ src: src, id: id, context: context, unique_name: unique_name }], function() { callback(); });
	else
		addTags.push({ src: src, id: id, context: context, unique_name: unique_name });

	return self;
	}

self.addImage = function(src, id, context, unique_name)
	{
	addTags.push({ createtag: "img", src: src, context: context, unique_name: unique_name, properties: {id: id} });

	return self;
	}

self.addCSS = function(href, id, context, media, unique_name)
	{
	addTags.push({ createtag: "link", href: href, context: context, unique_name: unique_name, properties: {id: id, media: media, type: "text/css", rel: "stylesheet" } });

	return self;
	}

self.addJS = function(src, id, context, unique_name)
	{
	addTags.push({ createtag: "script", src: src, context: context, unique_name: unique_name, properties: {id: id, type: "text/javascript"} });

	return self;
	}

self.addjQuery = function()
	{
	if(typeof jQuery === "undefined")
		addTags.push({ createtag: "script", src: "js/jquery.min.js", context: self.head(window), unique_name: "", properties: {type: "text/javascript"} });

	return self;
	}

self.addjQueryTag = function(callback)
	{ // Adds jQuery to the document, if it doesn't exist. Waits it to be loaded before returning.
	if(typeof jQuery == "undefined")
		{
		var script = document.createElement("script");
		script.type = "text/javascript";
		script.onreadystatechange = function()
			{
			if(this.readyState == 4)
				return callback();
			}
		script.onload = function()
			{
			return callback();
			}
		script.src = network.getEdgeURL(false, false, false) + "/js/jquery.min.js";

		var head = document.getElementsByTagName("head")[0] || document.documentElement;
		head.parentNode.insertBefore(script, head.nextSibling);
		}
	else
		callback();
	}
	
	// COMMON -- -- -- -- -- -- -- -- -- -- //
self.load = function(callback)
	{
	loadResources(addTags, function()
		{
		if(callback == "function");
			callback();
		});
	}

var loadResources = function(tags, callback)
	{ // Create a tag if its not created and load resource OR load resource to an existing tag
	var tag = null;

	if(tags.length == 0 && typeof callback == "function")									// All tags processed, return to caller
		return callback();
	else if(tags.length == 0)
		return;

	var nextTag = tags.shift();															// Get next tag

	if(nextTag.createtag)																	// Create a new tag and add parameters to it
		{
		tag = document.createElement(nextTag.createtag);

		for(var i in nextTag.properties)
			tag.setAttribute(i, nextTag.properties[i]);

		nextTag.context.appendChild(tag);
		}
	else if(nextTag.id)																		// Get an existing tag
		tag = nextTag.context.getElementById(nextTag.id);

	if(!tag)																				// Couldn't create or get the tag, ignore and proceed to next tag
		loadResources(tags, callback);
	else																					// We got tag
		{
		tag.onload = function()																	// Proceed to next tag when onload is fired
			{
			tag.onload = null;
			loadResources(tags, callback);
			}

		self.makeURL(nextTag.src ? nextTag.src : nextTag.href, nextTag.unique_name, function(err, data)	// Load the resource
			{
			network.GET(data, function(err, data)
				{
				if(!err)
					{
					var doc = tag.ownerDocument;
					var win = doc.defaultView || doc.parentWindow;

					tag.setAttribute(nextTag.src ? "src" : "href", win.URL.createObjectURL(data));
					}
				}, "blob");
			});
		}
	}

// Get application URL object.
self.makeURL = function(src, unique_name, callback)
	{
	if(!unique_name)																		// Use cores web server
		return returnURL(src, null, callback);

	core.getApplicationURL(unique_name, function(err, data)
		{
		return returnURL(src, data, callback);
		});
	}

// Compose the URL based on the data retrieved in makeURL method
var returnURL = function(src, urls, callback)
	{
	src = (src.search(/^\//) != -1 ? "" : "/") + src;

	if(!urls || (urls && !urls.type))														// Forced to use cores web server (type = null = unknown application)
		callback(null, network.getEdgeURL(false, false, false) + src);
	else
		{
		var objQuery = network.parseQuery(src, false);

		var appUrl = network.getProtocol(true) + (!network.isSecure() ? urls.url : urls.secureUrl)
					+ src
					+ network.remakeQueryString(objQuery, [], {app: urls.unique_name, type: urls.type}, null);

		callback(null, appUrl);
		}
	}

}