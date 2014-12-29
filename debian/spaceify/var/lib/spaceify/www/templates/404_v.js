#!/usr/bin/env node
/**
 * View file
 * @template 404
 */

function View()
{
var self = this;

self.getData = function(IP, URL, GET, POST, language, section, configuration)
	{
	return { language: language.code, kiwiLanguage: language.kiwiLanguage, smartyLanguage: language.smartyLanguage, kiwiConfiguration: configuration.kiwiConfiguration, smartyConfiguration: configuration.smartyConfiguration };
	}

}

module.exports = new View();
