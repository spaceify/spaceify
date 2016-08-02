"use strict";

/**
 * SpaceifyInitalize, 29.7.2015 Spaceify Oy
 *
 * Loads scripts, stylesheets and json files defined in the libs/inject/spaceify.min.csv file.
 *
 * @class SpaceifyInitalize
 */

function SpaceifyInitalize()
{
var self = this;

var rows = [];
var edgeURL = window.location.protocol + "//edge.spaceify.net/";

self.start = function(getjQuery)
	{
	load(edgeURL + "libs/inject/spaceify.min.csv", "application/text", function(str)
		{
		if(getjQuery && typeof jQuery === "undefined")
			str = "javascript\tjs/jquery.min.js\t-\tapplication/javascript\t-\n" + str;

		csvSplit(str);

		next();
		});
	}

var load = function(url, mime, callback)
	{
	var xobj = new XMLHttpRequest();

	xobj.overrideMimeType(mime);
	xobj.open("GET", url, true);
	xobj.onreadystatechange = function()
		{
		if(xobj.readyState == 4 && xobj.status == "200")
			callback(xobj.responseText)

		else if(xobj.readyState == 4 && xobj.status != "200")
			callback(null)
		};

	xobj.send(null);
	}

var csvSplit = function(csv)
	{
	var lines, tokens;

	lines = csv.split("\n");

	for(var i = 0; i<lines.length; i++)
		{
		lines[i] = lines[i].trim();

		if(lines[i] == "" || lines[i].charAt(0) == "#")
			continue;

		tokens = lines[i].split("\t");

		if(tokens.length != 5)
			continue;

		rows.push(tokens);
		}
	}

var next = function()
	{
	if(rows.length == 0)
		ready();
	else
		{
		var row = rows.shift();
		var inject_type = row[0].trim();
		var url = row[1].trim();
		var mime = row[3].trim();
		var parameter = row[4].trim();

		load(edgeURL + url, mime, function(str)
			{
			if(inject_type == "javascript")
				createTag("script", {type: "text/javascript"}, str);
			else if(inject_type == "css")
				createTag("style", {rel: "stylesheet", type: "text/css", media: parameter}, str);
			else if(inject_type == "text")
				{}
			else if(inject_type == "json")
				window[parameter] = JSON.parse(str);

			next();
			});
		}
	}

var createTag = function(tag, properties, text)
	{
	var element = document.createElement(tag);
	for(var i in properties)
		element.setAttribute(i, properties[i]);

	try {
		element.appendChild(document.createTextNode(text));
		document.body.appendChild(element);
		}
	catch(e)
		{
		element.text = text;
		document.body.appendChild(element);
		}
	}

var ready = function()
	{ // Send ready event
	var evt = document.createEvent("Event");
	evt.initEvent("spaceifyReady", true, true);
	window.dispatchEvent(evt);
	}

}

// WAIT UNTIL EVERYTHING ON THE PAGE IS LOADED AND READY BEFORE INJECTING
window.addEventListener("load", function()
	{
	// start is called manually from somewhere and
	if(document.getElementById("CUSTOMONLOAD"))
		return;

	// Get initialization parameters
	var query = {},  parts, pairs, regx = /=/i, scripts = document.getElementsByTagName("script");
	for(var i = 0; i < scripts.length; i++)
		{
		if(!scripts[i].src.match(/spaceifyinitialize\.js/))
			continue;

		if((parts = scripts[i].src.split("?")).length != 2)
			break;

		pairs = parts[1].split("&");

		for(var i = 0; i < pairs.length; i++)
			{
			if(regx.exec(pairs[i]))													// Name and value
				query[RegExp.leftContext] = RegExp.rightContext;
			else																	// Only name
				query[pairs[i]] = null;
			}

		break;
		}

	var spaceifyInitalize = new SpaceifyInitalize();
	spaceifyInitalize.start("jquery" in query ? true : false);
	});