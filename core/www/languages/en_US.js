#!/usr/bin/env node
/**
 * Language file for all templates
 * @language en_US
 */
 
function Language()
{
var self = this;

self.code = "en_US";

var sections =
	{
	"global":
		{
		"loading": "Loading..."
		},

	"index":
		{
		// index - Splash pages
		"splash_welcome": "Welcome to Spaceify powered wireless network.",
		"splash_info": "1. Insert Terms of use, privacy policy or anything here for your splash page. See index.html for details of how this page is generated and how to customize it for your purposes. 2. Add 'Accept' button for your site. Users can continue only if they agree with the rules of your edge node. 3. Add 'Install certificate' button. Allow user to load and install the Spaceify CA root certificate to their list of trusted certificates. Encrypted pages can be loaded only if the certificate is installed.",

		"splash_accept_action": "Accept",
		"splash_certificate_action": "Install certificate",

		// index - Normal page
		"title": "Welcome to Spaceify",

		"adminlogin": "Admin Log In",
		"adminlogout": "Admin Log Out",
		"password": "Password",
		"login": "Log In",
		"logout": "Log Out",

		"spacelets": "Spacelets",
		"sandboxed_applications": "Applications",
		"native_applications": "Native",
		"admin_tools": "Administration",

		"version": "v",
		},

	"404":
		{
		"title": "Page not found",
		"body": "404 Not Found - The requested page could not be found."
		}
	};

self.make = function(section)
	{
	var smartyLanguage = "";
	var kiwiLanguage = (sections[section] ? sections[section] : {});

	for(i in sections["global"])										// Add global strings to the selected section. NOTICE: global strings overwrite strings with same names in the section.
		kiwiLanguage[i] = sections["global"][i];

	for(i in kiwiLanguage)												// Make smarty compatible language "file"
		smartyLanguage += i + " = " + kiwiLanguage[i] + "\r\n";

	return { "kiwiLanguage": kiwiLanguage, "smartyLanguage": new Buffer(smartyLanguage).toString('base64') };
	}

}

module.exports = new Language();
