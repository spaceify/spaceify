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

self.getString = function(str)
	{
	return (csmarty != null ? csmarty.getConfig(str) : "");
	}
self.getConfig = function(str)
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

self.loadActiveContent = function(iframe_id, path, http_port, https_port)
	{ // Load tile or options page from applications internal webserver. path = pathname and search (e.g. '/the/path?query=string')	
	var app_url = $SN.makeApplicationURL({http_port: http_port, https_port: https_port});
	$SR.GET(app_url + path, function(err, data)
		{
		iframe = document.getElementById(iframe_id);
		iframe.onload = null;
		iframe.contentWindow.document.open("text/html");
		iframe.contentWindow.document.write(data);
		iframe.contentWindow.document.close();
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
			spaceify.showError(err.messages ? err.messages : err.message);

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
	$SC.adminLogOut($SU.getCookie(SESSION_ID_COOKIE), function(err, data)
		{
		if(err)
			spaceify.showError(err.messages);

		$SU.deleteCookie(SESSION_ID_COOKIE);

		self.showAdminLogInOut("in");
		self.showInstalledApplications();
		});
	}

self.showAdminLogInOut = function(type)
	{
	spaceify.load($SN.getEdgeURL() + "/templates/" + (type == "in" ? "admin_login.tpl" : "admin_logout.tpl"), function(err, data)
		{
		var tpl = spaceify.newjSmart(data);
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
			$("#spacelets").css("display", "block");
			$("#spacelets").append($.parseHTML("<h4>" + spaceify.getString("spacelets") + "</h4>"));

			for(var j=0; j<data.spacelets.length; j++)
				renderTile(data.spacelets[j], "spacelets");
			}

		if(data.sandboxed.length > 0)
			{
			$("#sandboxed_applications").css("display", "block");
			$("#sandboxed_applications").append($.parseHTML("<h4>" + spaceify.getString("sandboxed_applications") + "</h4>"));

			for(var j=0; j<data.sandboxed.length; j++)
				renderTile(data.sandboxed[j], "sandboxed_applications");
			}

		/*if(data.native.length > 0)
			{
			$("#native_applications").css("display", "block");
			$("#native_applications").append($.parseHTML("<h4>" + spaceify.getString("native_applications") + "</h4>"));

			for(var j=0; j<data.native.length; j++)
				renderTile(data.native[j], "native_applications");
			}*/

		});
	}

var renderTile = function(manifest, id)
	{
	if(manifest.is_running)
		{
		$SS.storeServices(manifest.service_mappings);	
		}

	var bOptions = (manifest.implements && manifest.implements.indexOf(spaceify.getConfig("OPTIONS")) != -1 ? true : false);
	var bActiveTile = (manifest.implements && manifest.implements.indexOf(spaceify.getConfig("ACTIVE_TILE")) != -1 ? true : false);
	var bSessionId = ( $SU.getCookie(SESSION_ID_COOKIE) != "" ? true : false);

	if(manifest.is_running && bActiveTile)															// APPLICATION RENDERS ITS OWN ACTIVE TILE
		{
		spaceify.load($SN.getEdgeURL() + "/templates/active_tile.tpl", function(err, data)
			{
			var unique_name = manifest.unique_name;
			var tpl = spaceify.newjSmart(data);
			var content = tpl.fetch({ unique_name: unique_name, http_port: $SS.getHttpService(unique_name).port, https_port: $SS.getHttpsService(unique_name).port });
			$("#" + id).append($.parseHTML(content));
			});
		}
	else																							// SPACEIFY EDGE RENDERS A DEFAULT TILE
		{
		spaceify.load($SN.getEdgeURL() + "/templates/app_tile.tpl", function(err, data)
			{
			var tpl = spaceify.newjSmart(data);
			var content = tpl.fetch({	name: manifest.name,
										unique_name: manifest.unique_name,
										type: manifest.type,
										version: manifest.version,
										category: manifest.category,
										edge_hostname: EDGE_HOSTNAME,
										protocol: spaceify.getProtocol(),
										imgOrdinal: ordinal++,
										options: (/*manifest.is_running && */bOptions && bSessionId)
									});
			$("#" + id).append($.parseHTML(content));
			});
		}
	}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// OPTIONS  // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.showOptionsDialog = function(unique_name)
	{
	if($("#optionsPopUp").is(':visible'))
		return;

	$SC.startSpacelet(unique_name, null, false, function(err, data)
		{
		if(err)
			spaceify.showError(err.messages ? err.messages : err.message);
		else
			{
			$("#optionsFrame").attr("src", "about:blank");														// Reset old data
			$("#optionsTitle").empty();

			$("#optionsTitle").append($.parseHTML(spaceify.getString("options") + unique_name));				// New title

			$("#popUpBG").css("display", "block");																// Show popup
			$("#optionsPopUp").css("display", "block");

			self.resizeOptionsDialog();

			self.loadActiveContent("optionsFrame", "/options/", $SS.getHttpService(unique_name).port, $SS.getHttpService(unique_name).port);
			}
		});

	return false;
	}

self.closeOptionsDialog = function()
	{
	$("#optionsPopUp").css("display", "none");
	$("#popUpBG").css("display", "none");

	$("#optionsTitle").empty();
	$("#optionsFrame").attr("src", "about:blank");

	return false;
	}

self.applyOptions = function()
	{
	$("#optionsFrame")[0].contentWindow.applyOptions();
	}
self.saveOptions = function()
	{
	$("#optionsFrame")[0].contentWindow.saveOptions();
	}
self.closeOptions = function()
	{
	$("#optionsFrame")[0].contentWindow.closeOptions();
	}

self.resizeOptionsDialog = function()
	{
	$("#optionsFrame").height($("#optionsPopUp").height() - $("#optionsTitleBar").height() - $("#optionsControlBar").height() - 2);	// Set size, subtract the bars + borders from the total height
	}

}

var spaceify = new Spaceify();
