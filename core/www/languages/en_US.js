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
		"splash_termsofuse": "<Insert Terms of use here>",
		"splash_privacypolicy": "<Insert Privacy policy here>",

		"splash_accept_text": "Click 'Accept' button if you agree with the Terms of use and Privacy policy.",
		"splash_certficate_text": "Click 'Install certificate' button if you want to load and install the Spaceify CA root certificate to your list of trusted certificates.",

		"splash_accept_action": "Accept",
		"splash_certificate_action": "Install certificate",

		"splash_redirecting": "Please wait, redirecting to '%1'.",

		// index - Normal page
		"title": "Welcome to Spaceify",

		"adminlogin": "Admin Log In",
		"adminlogout": "Admin Log Out",
		"password": "Password",
		"login": "Log In",
		"logout": "Log Out",

		"spacelets": "Spacelets",
		"sandboxed_applications": "Sandboxed",
		"native_applications": "Native",
		"admin_tools": "Administration",

		"version": "v",
		"options_title": "Show options dialog for %",

		"options": "Options&nbsp;-&nbsp;",
		"apply": "Apply",
		"apply_title": "Saves the options and applies them to use",
		"save": "Save",
		"save_title": "Saves the options but doesn't apply them to use",
		"close": "Close",
		"close_title": "Close the options dialog"
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
