/**
 * SpaceifyNet by Spaceify Inc. 29.7.2015
 *
 * For Spaceify's internal use.
 *
 * @class SpaceifyNet
 */

/* 
// Extend jQuery to have regex selectors. Source: http://james.padolsey.com/javascript/regex-selector-for-jquery/
jQuery.expr[':'].regex = function(elem, index, match)
	{
	var matchParams = match[3].split(','),
		validLabels = /^(data|css):/,
		attr = {method: matchParams[0].match(validLabels) ? matchParams[0].split(':')[0] : 'attr',
				property: matchParams.shift().replace(validLabels,'')},
		regexFlags = 'ig',
		regex = new RegExp(matchParams.join('').replace(/^\s+|\s+$/g,''), regexFlags);

	return regex.test(jQuery(elem)[attr.method](attr.property));
	}

var getElement = document.all ? function(id) { return document.all[id] } : function(id) { return document.getElementById(id) };
*/

function SpaceifyNet()
{
var self = this;

var csmarty = null;
var section = "";
var locale = "en_US";
var language = null;
var config_str = "";

var protocol = "http";

var ordinal = 0;
var showLoadingInstances = 0;

var core = new SpaceifyCore();
var config = new SpaceifyConfig();
var utility = new SpaceifyUtility();
var network = new SpaceifyNetwork();

	// CONFIGURATION / SMARTY -- -- -- -- -- -- -- -- -- -- //
self.initialize = function(_section, _locale, _language, _protocol)
	{
	section = _section;
	locale = _locale;
	language = utility.decodeBase64(_language);
	protocol = _protocol;

	for(i in config)																		// Make jSmarty compatible configuration
		config_str += i + " = " + config[i] + "\n";

	csmarty = self.newjSmart("");
	csmarty.fetch();
	}

self.getString = function(str)
	{
	return (csmarty != null ? csmarty.getConfig(str) : "");
	}

self.newjSmart = function(data)
	{
	var jsmart = new jSmart(data);
	jsmart.configLoad(language, (typeof section != "undefined" ? section : ""), jsmart.smarty);
	jsmart.configLoad(config_str, "", jsmart.smarty);

	return jsmart;
	}

self.load = function(url, callback)
	{
	self.showLoading(true);
	network.GET(url, function(err, data)
		{
		self.showLoading(false);
		callback(err, data);
		});
	}

	// USER INTERFACE -- -- -- -- -- -- -- -- -- -- //
self.showLoading = function(show)
	{
	if(show)
		{
		if(showLoadingInstances == 0)
			jQuery("#loading").show();
		showLoadingInstances++;
		}
	else
		{
		showLoadingInstances = Math.max(0, --showLoadingInstances);
		if(showLoadingInstances == 0)
			jQuery("#loading").hide();
		}
	}

self.showError = function(msg)
	{
	var obj = jQuery('<span class="edgeAlertError" id="error' + ordinal++ + '">' + msgFormat(msg) + '</span>');
	jQuery("#alert").append(obj);
	self.waitRemove(obj, 5000);
	}

self.showSuccess = function(msg)
	{
	var obj = jQuery('<span class="edgeAlertSuccess" id="success' + ordinal++ + '">' + msgFormat(msg) + '</span>');
	jQuery("#alert").append(obj);
	self.waitRemove(obj, 5000);
	}

self.waitRemove = function(obj, wait)
	{
	window.setTimeout(function() { obj.remove(); }, wait);
	}

var msgFormat = function(msg)
	{
	var rmsg = "";
	if(self.isArray(msg))
		{
		for(var i=0; i<msg.length; i++)
			rmsg += (rmsg != "" ? "<br>" : "") + msg[i];
		}
	else
		rmsg = msg;

	return rmsg;
	}

self.onEnterPress = function(e)
	{
	key = (typeof e == null ? window.event.keyCode : e.keyCode);
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
		logger.error(err);
		}
	}

self.loadCertificate = function()
	{
	document.getElementById("certiframe").src = network.getEdgeURL() + "/spaceify.crt";
	return true;
	}

	// ADMIN -- -- -- -- -- -- -- -- -- -- //
self.showAdminTile = function(callback)
	{
	self.load(network.getEdgeURL() + "/templates/admin_tile.tpl", function(err, data)
		{
		var tpl = self.newjSmart(data);
		var content = tpl.fetch({});
		jQuery("#adminLogIn").empty();
		jQuery("#adminLogIn").append(jQuery.parseHTML(content));

		if(typeof callback == "function")
			callback();
		});
	}

	// USER UTILITIES -- -- -- -- -- -- -- -- -- -- //
self.showUserUtilities = function(callback)
	{
	self.load(network.getEdgeURL() + "/templates/user_certificate_tile.tpl", function(err, data)
		{
		var tpl = self.newjSmart(data);
		var content = tpl.fetch({});
		jQuery("#userInstallCertificate").empty();
		jQuery("#userInstallCertificate").append(jQuery.parseHTML(content));

		if(typeof callback == "function")
			callback();
		});
	}

	// APPLICATIONS -- -- -- -- -- -- -- -- -- -- //
self.showInstalledApplications = function(callback)
	{
	jQuery("#spacelets").empty();
	jQuery("#sandboxed_applications").empty();
	jQuery("#native_applications").empty();

	var methods = [];
	
	core.getApplicationData(function(err, apps)
		{
		if(!apps)
			return (typeof callback == "function" ? callback() : false);

		jQuery("#spacelet, #spacelets_header").css("display", (apps.spacelets.length > 0 ? "block" : "none"));
		for(var j=0; j<apps.spacelets.length; j++)
			methods.push({object: self, method: renderTile, params: [apps.spacelets[j], function(){}], type: "sync"});

		jQuery("#sandboxed, #sandboxed_header").css("display", (apps.sandboxed.length > 0 ? "block" : "none"));
		for(var j=0; j<apps.sandboxed.length; j++)
			methods.push({object: self, method: renderTile, params: [apps.sandboxed[j], function(){}], type: "sync"});

		jQuery("#native, #native_header").css("display", (apps.native.length > 0 ? "block" : "none"));
		for(var j=0; j<apps.native.length; j++)
			methods.push({object: self, method: renderTile, params: [apps.native[j], function(){}], type: "sync"});

		new SpaceifySynchronous().waterFall(methods, function()
			{
			return (typeof callback == "function" ? callback() : false);
			});
		});

	}

var renderTile = function(manifest, callback)
	{
	if(manifest.has_tile)																			// APPLICATION SUPPLIES ITS OWN TILE
		{
		core.getApplicationURL(manifest.unique_name, function(err, appURL)
			{
			self.load(network.getEdgeURL() + "/templates/tile.tpl", function(err, tpl)
				{
				var unique_name = manifest.unique_name.replace("/", "_");								// TILE
				var tpl = self.newjSmart(tpl);
				var content = tpl.fetch({ unique_name: unique_name });
				jQuery("#" + manifest.type).append(jQuery.parseHTML(content));

				var src;																				// CONTENT
				if(manifest.is_running && network.implementsWebServer(manifest))
					src = network.getProtocol(true) + "10.0.0.1" + ":" + (!network.isSecure() ? appURL.http_port : appURL.https_port) + "/" + config.TILEFILE;
				else
					src = network.getProtocol(true) + "10.0.0.1/_" + manifest.type + "/" + manifest.unique_name + "_/" + config.TILEFILE;

				jQuery("#" + unique_name).attr("src", src);

				if(typeof callback == "function")
					callback();
				});
			});
		}
	else																							// SPACEIFY RENDERS A DEFAULT TILE
		{
		self.load(network.getEdgeURL() + "/templates/default_tile.tpl", function(err, data)
			{
			var image = network.getEdgeURL() + "/images/default_icon.png";								// Show default image or applications custom image

			if(manifest.images)
				{
				for(var i=0; i<manifest.images.length; i++)
					{
					if(manifest.images[i].file.search("/^(icon\.)/i" != -1))
						{
						image = network.getEdgeURL() + "/_" + manifest.type + "/" + manifest.unique_name + "_/www/images/";
						image += (manifest.images[i].directory ? manifest.images[i].directory : "") + manifest.images[i].file;
						break;
						}
					}
				}

			var tpl = self.newjSmart(data);
			var content = tpl.fetch({ manifest: manifest, edge_hostname: config.EDGE_IP, image: image });
			jQuery("#" + manifest.type).append(jQuery.parseHTML(content));

			if(typeof callback == "function")
				callback();
			});
		}
	}

}
