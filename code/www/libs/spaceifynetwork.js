/**
 * Spaceify Network by Spaceify Inc. 29.7.2015
 *
 * @class SpaceifyNetwork
 */

function SpaceifyNetwork()
{
var self = this;

var config = new SpaceifyConfig();

// Get the URL to the Spaceify Core
self.getEdgeURL = function()
	{
	return location.protocol + "//" + config.EDGE_IP;
	}

// Get secure or insecure URL
self.getWebServer = function(port, secure_port, is_secure)
	{
	return location.protocol + "//" + config.EDGE_IP + ":" + self.getPort(port, secure_port, is_secure);
	}

self.getEdgeWebServer = function(is_secure)
	{
	return self.getWebServer(config.EDGE_PORT_HTTP, config.EDGE_PORT_HTTPS, is_secure);
	}

// Get secure or insecure port based on web pages protocol or requested security
self.getPort = function(port, secure_port, is_secure)
	{
	return (!self.isSecure() && !is_secure ? port : secure_port);
	}

self.getCorePort = function(is_secure)
	{
	var port;

	//if(window.WebSocket)
		port = self.getPort(config.CORE_PORT_WEBSOCKET, config.CORE_PORT_WEBSOCKET_SECURE, is_secure);
	//else
	//	port = self.getPort(config.CORE_PORT_ENGINEIO, config.CORE_PORT_ENGINEIO_SECURE, is_secure);

	return port;
	}

self.getApplicationManagerPort = function()
	{
	return config.APPMAN_PORT_WEBSOCKET_SECURE;
	}

// Return true if current web page is encrypted
self.isSecure = function()
	{
	return (location.protocol == "http:" ? false : true);
	}

// Return current protocol
self.getProtocol = function(withScheme)
	{
	return (location.protocol == "http:" ? "http" : "https") + (withScheme ? "://" : "");
	}
	
// Parse GET from the url. Add origin part of the url to the returned object if requested.
self.parseGET = function(url, bOrigin)
	{
	var obj_get = {};
	var regx = new RegExp("=", "i");

	var getsplit = url.split("?");
	if(getsplit.length == 2)
		{
		var getparts = getsplit[1].split("&");
		for(gpi in getparts)
			{
			regx.exec(getparts[gpi]);
			obj_get[RegExp.leftContext] = RegExp.rightContext;
			}
		}

	if(bOrigin)
		obj_get.origin = getsplit[0];

	return obj_get;
	}

self.makeGET = function(obj_get)
	{ // Make object of GET parameters to GET string.
	var get = "";
	for(g in obj_get)
		get += (get != "" ? "&" : "") + g + "=" + obj_get[g];

	return (get != "" ? "?" : "") + get;
	}

self.parseURL = function(url)
	{
	/*var parser = document.createElement("a");
	parser.href = url;
	return parser;*/

	// parseUri 1.2.2
	// (c) Steven Levithan <stevenlevithan.com>
	// MIT License
	var	o	=
		{
		strictMode: false,
		key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
		q:	{
			name:   "queryKey",
			parser: /(?:^|&)([^&=]*)=?([^&]*)/g
			},
		parser: {
			strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
			loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
			}
		},
		m	= o.parser[o.strictMode ? "strict" : "loose"].exec(url),
		uri	= {},
		i	= 14;

	while (i--) uri[o.key[i]] = m[i] || "";

	uri[o.q.name] = {};
	uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
		if ($1) uri[o.q.name][$1] = $2;
	});

	return uri;
	}

self.implementsWebServer = function(manifest)
	{
	return (manifest.implements && manifest.implements.indexOf(config.WEB_SERVER) != -1 ? true : false);
	}

	// XMLHttp -- -- -- -- -- -- -- -- -- -- //
self.GET = function(url, callback, rtype)
	{
	var xmlhttp = createXMLHTTP();
	xmlhttp.onreadystatechange = function() { onReadyState(xmlhttp, callback); };

	xmlhttp.open("GET", url, true);
	xmlhttp.responseType = (rtype ? rtype : "");
	xmlhttp.send();
	}

self.POST = function(url, post, rtype, callback)
	{
	var boundary = "b---------------------------" + Date.now().toString(16);
	var eboundary = "\r\n--" + boundary + "--\r\n";

	var content = "";
	for(var i=0; i<post.length; i++)
		{
		if(!post[i].filename)														// post.data name-parameter pairs
			{
			content += "--" + boundary + "\r\n";
			content += 'Content-Disposition: form-data; name="' + post[i].name + '"\r\n\r\n';
			content += post[i].data + "\r\n";
			}
		/*else if(post[i].type == "form-data")										// post.data contains an array of values having values [0,255] = a file
			{
			content += 'Content-Disposition: form-data; name="' + post[i].name + '";  filename="' + post[i].filename + '"\r\n';
			content += 'Content-Type: "application/octet-stream"\r\n';
			content += "Content-Transfer-Encoding: binary\r\n\r\n"

			for(var j=0; j<post[i].data.length; j++)
				content += String.fromCharCode(post[i].data[j]);
			}*/
		}
	content += "--" + boundary + "--\r\n";

	var xmlhttp = createXMLHTTP();
	xmlhttp.onreadystatechange = function() { onReadyState(xmlhttp, callback); };
	xmlhttp.open("POST", url, true);
	xmlhttp.responseType = (rtype ? rtype : "");
	xmlhttp.setRequestHeader("Content-Type", "multipart\/form-data; boundary=" + boundary);
	xmlhttp.setRequestHeader("Content-Length", content.length);
	xmlhttp.send(content);
	}

var createXMLHTTP = function()
	{
	return (window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP"));		// IE7+, Firefox, Chrome, Opera, Safari : IE6, IE5
	}

var onReadyState = function(xmlhttp, callback)
	{
	if(xmlhttp.readyState == 4)
		callback( (xmlhttp.status != 200 ? xmlhttp.status : null), (xmlhttp.status == 200 ? xmlhttp.response : null) );
	}

self.POST_JSON = function(url, json_data, callback)
	{
	try {
		var json_str = JSON.stringify(json_data);

		var xmlhttp = createXMLHTTP();
		xmlhttp.open("POST", url, true);
		xmlhttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
		xmlhttp.setRequestHeader("Content-length", json_str.length);
		xmlhttp.setRequestHeader("Connection", "close");
		xmlhttp.onreadystatechange = function()
			{
			if(xmlhttp.readyState == 4)
				{
				if(xmlhttp.status != 200 && xmlhttp.status != 304)
					callback(xmlhttp.status, null);
				else if(xmlhttp.status == 200)
					{
					var result = JSON.parse(xmlhttp.responseText.replace(/&quot;/g,'"'));
					callback(result.err, result.data);
					}
				else
					callback(null, null);
				}
			}
		xmlhttp.send(json_str);
		}
	catch(err)
		{
		callback(err, null);
		}
	}

}