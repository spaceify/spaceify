"use strict";

/**
 * SpaceifyNet, 29.7.2015 Spaceify Oy
 *
 * For Spaceify's internal use.
 *
 * @class SpaceifyNet
 */

function SpaceifyNet()
{
var self = this;

var ordinal = 0;
var showLoadingInstances = 0;

var core = new SpaceifyCore();
var config = new SpaceifyConfig();
var utility = new SpaceifyUtility();
var network = new SpaceifyNetwork();

	// USER INTERFACE -- -- -- -- -- -- -- -- -- -- //
self.showLoading = function(show)
	{
	if(show)
		{
		if(showLoadingInstances == 0)
			$("#loading").show();
		showLoadingInstances++;
		}
	else
		{
		showLoadingInstances = Math.max(0, --showLoadingInstances);
		if(showLoadingInstances == 0)
			$("#loading").hide();
		}
	}

self.showError = function(msgstr) { alerts(msgstr, "error"); }
self.showSuccess = function(msgstr) { alerts(msgstr, "success"); }
var alerts = function(msgstr, type)
	{
	var obj;

	if((obj = $("#alerting")).length > 0)
		obj.remove();

	obj = $('<span class="edgeAlert ' + type + '" id="alerting">' + msgstr + '</span>');
	$(document.body).append(obj);

	obj.css("left", ($(window).width() - obj.width()) / 2);
	obj.css("visibility", "visible");

	window.setTimeout(function() { obj.remove(); }, 5000);
	}

var msgFormat = function(msg)
	{
	var rmsg = "", i;

	if(self.isArray(msg))
		{
		for(i = 0; i < msg.length; i++)
			rmsg += (rmsg != "" ? "<br>" : "") + msg[i];
		}
	else
		rmsg = msg;

	return rmsg;
	}

self.onEnterPress = function(e)
	{
	var key = (typeof e == null ? window.event.keyCode : e.keyCode);
	return (key == 13 || key == 10 ? true : false);
	}

self.isArray = function(obj)
	{
	return Object.prototype.toString.call(obj) === "[object Array]";
	}

	// SPLASH -- -- -- -- -- -- -- -- -- -- //
self.setSplashAccepted = function()
	{
	try {
		core.setSplashAccepted(function(err, data)
			{
			if(data && data == true)
				window.location.reload(true);
			});
		}
	catch(err)
		{
		logger.error(err, true, true, 0, logger.ERROR);
		}
	}

self.loadCertificate = function()
	{
	document.getElementById("certIframe").src = network.getEdgeURL(false, false, false) + "/spaceify.crt";
	return true;
	}

	// ADMIN -- -- -- -- -- -- -- -- -- -- //
self.showAdminTile = function(callback)
	{
	$("#adminUtilities").empty();
	var evt = new CustomEvent("addTile", {detail: {type: "adminTile", container: "adminUtilities", src: network.getEdgeURL(true, false, false) + "/admin", callback: callback}, bubbles: true, cancelable: true});
	document.body.dispatchEvent(evt);
	}

	// USER UTILITIES -- -- -- -- -- -- -- -- -- -- //
self.showUserUtilities = function(callback)
	{
	$("#userUtilities").empty();
	var evt = new CustomEvent("addTile", {detail: {type: "certificateTile", container: "userUtilities", callback: callback}, bubbles: true, cancelable: true});
	document.body.dispatchEvent(evt);
	}

	// APPLICATIONS -- -- -- -- -- -- -- -- -- -- //
self.showInstalledApplications = function(callback)
	{
	$("#spacelet").empty();
	$("#sandboxed").empty();
	$("#native").empty();

	var methods = [], j;

	core.getApplicationData(function(err, apps)
		{
		if(!apps)
			return (typeof callback == "function" ? callback() : false);

		for(j = 0; j < apps.spacelet.length; j++)
			methods.push({object: self, method: renderTile, params: [apps.spacelet[j], null], type: "async"});

		for(j = 0; j < apps.sandboxed.length; j++)
			methods.push({object: self, method: renderTile, params: [apps.sandboxed[j], null], type: "async"});

		for(j = 0; j < apps.native.length; j++)
			methods.push({object: self, method: renderTile, params: [apps.native[j], null], type: "async"});

		new SpaceifySynchronous().waterFall(methods, function()
			{
			if(typeof callback == "function")
				callback(apps.spacelet.length, apps.sandboxed.length, apps.native.length);
			});
		});

	}

var renderTile = function(manifest, callback)
	{
	var src, evt, i;

	if(manifest.hasTile)																			// APPLICATION SUPPLIES ITS OWN TILE
		{
		core.getApplicationURL(manifest.unique_name, function(err, appURL)
			{
			if(manifest.isRunning && network.implementsWebServer(manifest))
				src = network.getEdgeURL(false, true, false) + (!network.isSecure() ? appURL.port : appURL.securePort) + "/" + config.TILEFILE;
			else
				src = self.externalResourceURL(manifest.unique_name, config.TILEFILE);

			evt = new CustomEvent("addTile", {detail: {type: "appTile", container: manifest.type, manifest: manifest, src: src, callback: callback}, bubbles: true, cancelable: true});
			document.body.dispatchEvent(evt);
			});
		}
	else																							// SPACEIFY RENDERS A DEFAULT TILE
		{
		var src = network.getEdgeURL(false, false, false) + "/images/icon.png";						// Show default icon or applications custom icon

		if(manifest.images)
			{
			for(i = 0; i < manifest.images.length; i++)
				{
				if(manifest.images[i].file.search("/^(icon\.)/i" != -1))
					{
					src = self.externalResourceURL(	manifest.unique_name, 
													(manifest.images[i].directory ? manifest.images[i].directory + "/" : "") + manifest.images[i].file);
					break;
					}
				}
			}

		evt = new CustomEvent("addTile", {detail: {type: "tile", container: manifest.type, manifest: manifest, src: src, callback: callback}, bubbles: true, cancelable: true});
		document.body.dispatchEvent(evt);
		}
	}

self.externalResourceURL = function(unique_name, file)
	{ // This is implemented exactly the same way in the ecap-spaceify-injector (Injector::getFiles)
	return network.getEdgeURL(false, false, true) + unique_name + "/" + file;
	}

}
