#!/usr/bin/env node
/**
 * Language utility by Spaceify Inc. 31.7.2015
 *
 * @class Language
 */

function LanguageUtility()
{
var self = this;

self.make = function(section, _language)
	{
	var sections = JSON.parse(_language);

	var language_smarty = "";
	var language = (sections[section] ? sections[section] : {});

	for(i in sections["global"])										// Add global strings to the selected section. NOTICE: global strings overwrite strings with same names in the section.
		language[i] = sections["global"][i];

	for(i in language)													// Make also smarty compatible language "file"
		language_smarty += i + " = " + language[i] + "\r\n";

	return { section: section,
			 locale: sections["global"].locale,
			 language: language,
			 language_smarty: new Buffer(language_smarty).toString("base64") };
	}

}

module.exports = new LanguageUtility();
