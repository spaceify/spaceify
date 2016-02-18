#!/usr/bin/env node
/**
 * Language utility by Spaceify Inc. 31.7.2015
 *
 * @class Language
 */

function LanguageUtility()
{
var self = this;

self.make = function(language, section, global)
	{
	for(i in global)													// Add global strings to the selected section. NOTICE: global strings overwrite strings with same names in the section.
		language[i] = global[i];

	var language_smarty = "";											// Make also smarty compatible language "file"
	for(i in language)
		language_smarty += i + " = " + language[i] + "\r\n";

	return { section: section,
			 locale: global.locale,
			 language: language,
			 language_smarty: new Buffer(language_smarty).toString("base64") };
	}

}

module.exports = new LanguageUtility();
