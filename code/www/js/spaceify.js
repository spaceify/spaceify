/* Extend jQuery to have regex selectors. Source: http://james.padolsey.com/javascript/regex-selector-for-jquery/ */
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

var getElement = document.all ? function (id) { return document.all[id] } : function (id) { return document.getElementById(id) };

function Spaceify()
{
var self = this;

var csmarty = null;
var section = "";
var language = "en_US";
var languageFile = null;
var configurationFile = null;

var protocol = "http";

var ordinal = 0;
var showLoadingInstances = 0;

self.setConfig = function(_language, _languageFile, _configurationFile, _section, _protocol)
	{
	language = _language;
	languageFile = $SU.decodeBase64(_languageFile);
	configurationFile = $SU.decodeBase64(_configurationFile);
	section = _section;
	protocol = _protocol;

	csmarty = self.newjSmart("");
	csmarty.fetch();
	}

self.getProtocol = function()
	{
	return protocol;
	}

self.isSecure = function()
	{
	return (protocol == "http" ? false : true);
	}

self.getString = self.getConfig = function(str)
	{
	return (csmarty != null ? csmarty.getConfig(str) : "");
	}

self.newjSmart = function(data, section)
	{
	var jsmart = new jSmart(data);
	jsmart.configLoad(languageFile, (typeof section != "undefined" ? section : ""), jsmart.smarty);
	jsmart.configLoad(configurationFile, "", jsmart.smarty);

	return jsmart;
	}

self.load = function(url, callback)
	{
	self.showLoading(true);
	$SR.GET(url, function(err, data)
		{
		self.showLoading(false);
		callback(err, data);
		});
	}

self.loadActiveContent = function(unique_name, path, id)
	{ // Load initial content to tile or options page from applications	
	$SR.makeURL(path, unique_name, function(err, data)
	{
		$SR.GET(data, function(err, data)
			{
			iframe = document.getElementById(id ? id : unique_name);
//iframe.contentWindow.document.domain = window.location.hostname;
			iframe.onload = null;
			iframe.contentWindow.document.open("text/html");
			iframe.contentWindow.document.write(data);
			iframe.contentWindow.document.close();
			});
		});
	}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// USER INTERFACE // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
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

self.showError = function(msg)
	{
	var obj = $('<span class="edgeAlertError" id="error' + ordinal++ + '">' + msgformat(msg) + '</span>');
	$("#alert").append(obj);
	self.waitRemove(obj, 5000);
	}

self.showSuccess = function(msg)
	{
	var obj = $('<span class="edgeAlertSuccess" id="success' + ordinal++ + '">' + msgformat(msg) + '</span>');
	$("#alert").append(obj);
	self.waitRemove(obj, 5000);
	}

self.waitRemove = function(obj, wait)
	{
	window.setTimeout(function() { obj.remove(); }, wait);
	}

var msgformat = function(msg)
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
	
// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// SPLASH	// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.setSplashAccepted = function()
	{
	try {
		spaceifyCore.setSplashAccepted(function(err, data)
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
	document.getElementById("certiframe").src = $SN.getEdgeURL() + "/spaceifyCA.crt";
	}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// ADMIN LOG IN / OUT   // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.adminLogIn = function()
	{
	$SC.adminLogIn($("#password").val(), function(err, data)
		{
		if(err)
			{
			$SU.deleteCookie(SESSION_ID_COOKIE);
			self.showError(err.messages ? err.messages : err.message);

			$("#password").val("");
			$("#password").focus();
			}
		else
			{
			$SU.setCookie(SESSION_ID_COOKIE, data);

			self.showAdminLogInOut("out");
			self.showInstalledApplications();
			}
		});
	}

self.adminLogOut = function()
	{
	$SC.adminLogOut(function(err, data)
		{
		if(err)
			self.showError(err.messages);

		$SU.deleteCookie(SESSION_ID_COOKIE);

		self.showAdminLogInOut("in");
		self.showInstalledApplications();
		});
	}

self.showAdminLogInOut = function(type)
	{
	self.load($SN.getEdgeURL() + "/templates/" + (type == "in" ? "admin_login.tpl" : "admin_logout.tpl"), function(err, data)
		{
		var tpl = self.newjSmart(data);
		var content = tpl.fetch({});
		$("#adminLogIn").empty();
		$("#adminLogIn").append($.parseHTML(content));
		});
	}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// TILES / APPLICATIONS // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.showInstalledApplications = function()
	{
	$("#spacelets").empty();
	$("#sandboxed_applications").empty();
	//$("#native_applications").empty();

	$SC.getApplicationData(null, function(err, data)
		{
		if(data.spacelets.length > 0)
			{
			$("#spacelets").css("display", "block");												// Show spacelets section title
			$("#spacelets").append($.parseHTML("<h4>" + self.getString("spacelets") + "</h4>"));

			for(var j=0; j<data.spacelets.length; j++)
				renderTile(data.spacelets[j], "spacelets");
			}

		if(data.sandboxed.length > 0)
			{
			$("#sandboxed_applications").css("display", "block");									// Show sandboxed section title
			$("#sandboxed_applications").append($.parseHTML("<h4>" + self.getString("sandboxed_applications") + "</h4>"));

			for(var j=0; j<data.sandboxed.length; j++)
				renderTile(data.sandboxed[j], "sandboxed_applications");
			}

		/*if(data.native.length > 0)
			{
			$("#native_applications").css("display", "block");										// Show native section title
			$("#native_applications").append($.parseHTML("<h4>" + self.getString("native_applications") + "</h4>"));

			for(var j=0; j<data.native.length; j++)
				renderTile(data.native[j], "native_applications");
			}*/

		});
	}

var renderTile = function(manifest, id)
	{
	if(manifest.has_tile)																			// APPLICATION RENDERS ITS OWN TILE
		{
		self.load($SN.getEdgeURL() + "/templates/tile.tpl", function(err, data)
			{
			var tpl = self.newjSmart(data);
			var content = tpl.fetch({ manifest: manifest });
			$("#" + id).append($.parseHTML(content));
			});
		}
	else																							// SPACEIFY RENDERS A DEFAULT TILE
		{
		self.load($SN.getEdgeURL() + "/templates/default_tile.tpl", function(err, data)
			{
			var image = $SN.getEdgeURL() + "/images/dicon.png";											// Show default image or applcations custom image
			if(manifest.images)
				{
				for(var i=0; i<manifest.images.length; i++)
					{
					if(manifest.images[i].name.search("/^(icon\.)/i" != -1)) {
						image = (manifest.images[i].directory ? manifest.images[i].directory : "") + "/images/" + manifest.images[i].name; break; }
					}
				}

			var tpl = self.newjSmart(data);
			var content = tpl.fetch({ manifest: manifest, edge_hostname: EDGE_HOSTNAME, image: image });
			$("#" + id).append($.parseHTML(content));
			});
		}
	}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// OPTIONS  // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.showOptions = function(show, unique_name, directory, file)
	{
	var ok = false;

	if(show && $("#edgeOptionsFrame").css("visibility") == "hidden" && $SU.getCookie(SESSION_ID_COOKIE))
		{
		$("#edgeOptionsFrame").attr("src", "about:blank");													// Reset old data, resize and show
		$("#edgeOptionsFrame").css("visibility", "visible");

		self.loadActiveContent(unique_name, directory + file, "edgeOptionsFrame");
		}
	else if(!show && $("#edgeOptionsFrame").is(':visible'))
		{
		$("#edgeOptionsFrame").css("visibility", "hidden");
		$("#edgeOptionsFrame").attr("src", "about:blank");
		ok = true;
		}

	return ok;
	}

}

var spaceify = new Spaceify();
var $S = spaceify;