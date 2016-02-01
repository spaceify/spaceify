/**
 * Dynamic Spaceify initialization by Spaceify Inc. 29.7.2015
 *
 * Loads scripts, stylesheets and json files defined in libs/inject/spaceify.csv.
 * Based on them creates script and link tags and sets up variables for json.
 *
 */

var _srows = [];
var _suri = window.location.protocol + "//10.0.0.1/";

// STARTING POINT - WAIT FOR EVERYTHING ELSE ON THE PAGE TO BE LOADED AND READY BEFORE INJECTING
window.addEventListener("load", function()
	{
	// Accept connection only from 10.0.0.1 to make html cookie sessions actually work
	if(window.location.hostname == "edge.spaceify.net")
		window.location.assign(window.location.protocol + "//10.0.0.1" + window.location.pathname);
	else
		_sinitLoad(_suri + "libs/inject/spaceify.csv", "application/text", function(str)
		{
		var text = "", inject_type, parameter;
		_sinitCSVSplit(str);
		_sinitNext();
		});
	});

function _sinitLoad(url, mime, callback)
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

function _sinitCSVSplit(spaceify_csv)
	{
	var lines, tokens;

	lines = spaceify_csv.split("\n");
	for(var i=0; i<lines.length; i++)
		{
		lines[i] = lines[i].trim();

		if(lines[i] == "" || lines[i] == "#" || lines[i].charAt(0) == "#")
			continue;

		tokens = lines[i].split("\t");

		if(tokens.length != 5)
			continue;

		_srows.push(tokens);
		}
	}

var _sinitNext = function()
	{
	if(_srows.length == 0)
		_sinitReady();
	else
		{
		var row = _srows.shift();
		var inject_type = row[0].trim();
		var url = row[1].trim();
		var mime = row[3].trim();
		var parameter = row[4].trim();

		_sinitLoad(_suri + url, mime, function(str)
			{
			if(inject_type == "javascript")
				_sinitCreateTag("script", {type: "text/javascript"}, str);
			else if(inject_type == "css")
				_sinitCreateTag("style", {rel: "stylesheet", type: "text/css", media: parameter}, str);
			else if(inject_type == "text")
				{}
			else if(inject_type == "json")
				window[parameter] = JSON.parse(str);

			_sinitNext();
			});
		}
	}

	function _sinitCreateTag(tag, properties, text)
	{
	var element = document.createElement(tag);
	for(i in properties)
		element.setAttribute(i, properties[i]);

    try {
		element.appendChild(document.createTextNode(text));
		document.head.appendChild(element);
		}
	catch(e)
		{
		element.text = text;
		document.head.appendChild(element);
		}
	}

function _sinitReady()
	{
	// Send ready event
	var evt = document.createEvent("Event");
	evt.initEvent("spaceifyReady", true, true);
	window.dispatchEvent(evt);
	}