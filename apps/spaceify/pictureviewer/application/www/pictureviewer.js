var bigscreenRPC = null;
var unique_name = "spaceify/pictureviewer";

var RECONNECT_TIMEOUT = 10;

/**
 * DOM * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 */
window.addEventListener("load", function()
{
	if(typeof jQuery == "undefined")
	{
		var script = document.createElement('script');
		script.type = "text/javascript";
		script.onreadystatechange = function() { if(this.readyState == 4) pageLoaded(); }
		script.onload = function() { connect(); }
		script.src = location.protocol + "//edge.spaceify.net/js/metro/jquery/jquery.min.js";

		var head = document.getElementsByTagName("head")[0] || document.documentElement;
		head.parentNode.insertBefore(script, head.nextSibling);
	}
	else
		connect();
});

/**
 * RPC CONNECTION  * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 */
function connect()
{
	// Start the Picture viewer spacelet - returns the command connection to the bigscreen application
	spaceifyCore.startSpacelet(unique_name, "spaceify.org/services/picture_command", false, function(err, data)
	{
		if(err)
		{
			initialize(false, language.formatErrorString("connect:startSpacelet:", err));
			close(true);
		}
		else
		{
			bigscreenRPC = data;
			bigscreenRPC.exposeRPCMethod("pageReady", self, pageReady);					// Must be implemented
			bigscreenRPC.exposeRPCMethod("close", self, close);							// close originates from the jsapp when all the bigscreens are closed or from connection class when connection is lost
			bigscreenRPC.setCloseEventListener(close);

			processImgTags(true);														// check img tags

			if(localStorage)															// Clear paywall
				localStorage.clear();
		}
	});
}

/**
 * EXPOSED BIGSCREEN RPC METHODS * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 */
function pageReady(source, content, initialized)
{ // Some page, pictureviewer or other, is now loaded. If pictureviewer is loaded the content is the url passed to bigscreenRPC::showContent.
	initialize((source == "pictureviewer" ? initialized : false));

	return true;
}

function close(isInternal)
{
	if(bigscreenRPC)
	{
		initialize(false);

		bigscreenRPC.close();
		bigscreenRPC = null;
	}

	window.setTimeout(connect, RECONNECT_TIMEOUT * 1000);								// Try to reconnect
}

/**
 * EVENTS FROM THE INJECTED CONTROLS * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 */
function showPicture(url)
{
	if(bigscreenRPC)
		bigscreenRPC.call("showContent", ["pictureviewer", ":" + spaceifyNetwork.getApplicationWebServerPort(unique_name, null) + "/pictureviewer.html", url, null, spaceifyNetwork.isSecure()], null, null);
	else
		showMessage(language.E_NO_CONNECTION);
}

/**
 * COMMON FUNCTIONS  * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 */
function processImgTags(bSet)
{
	var regx = /(\.jpg|\.png|\.gif)$/;

	$('img').each(function()
	{
		var isInsideLink = false;
		var srcFromHref = "";

		$(this).parents().each(function()													// find out is the image inside a hyperlink
		{
			if($(this).prop("tagName") == "A")													// yes -> does the link specify an image = check the presence of a known file extension
			{
				if($(this).prop("pathname").match(regx))
				{
					srcFromHref = $(this).prop("href");												// store the href and clear hyperlink so that browser stays on the same page
					$(this).prop("href", "");
				}
				else																			// no -> don't add click event handler
					isInsideLink = true;
			}
		});

		//if(!isInsideLink)
		//{
			//$(this).css("box-sizing", "border-box");
			//$(this).css("-moz-box-sizing", "border-box");
			
			/*if(bSet)
			{*/
				$(this).css("margin", "0px");
				$(this).css("padding", "0px");
				$(this).css("border-top", "4px solid #" + (bSet ? "0F0" : "F80"));
				$(this).css("border-bottom", "4px solid #" + (bSet ? "0F0" : "F80"));

				$(this).click(function()
				{
					url = (srcFromHref != "" ? srcFromHref : $(this).attr("src"));
					showPicture(url, false);
					$(this).fadeOut(500, function() { $(this).fadeIn(500); });
				});
			/*}
			else
			{
				$(this).unbind("click");
				$(this).css("border-top", "0px none transparent");
				$(this).css("border-bottom", "0px none transparent");
			}*/
		//}
	});
}

function initialize(status, errstr)
{
	showMessage(errstr);
	processImgTags(status);
}

function showMessage(str)
{
	//alert(errstr);
	console.log(str);
}
