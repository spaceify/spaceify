"use strict";

/**
 * Spaceify configuration, 28.1.2016 Spaceify Oy
 *
 * @class SpaceifyConfig
 */

function SpaceifyConfig()
{
var self = this;

if(typeof exports !== "undefined")
	{
	var i, file = require("fs").readFileSync((process.env.IS_REAL_SPACEIFY ? "/api/www/libs/" : "www/libs/") + "config.json", "utf8");

	var config = JSON.parse(file);
	for(i in config)
		self[i] = config[i];
	}
else
	{
	for(i in window.sconfig)
		self[i] = window.sconfig[i];
	}

}

if(typeof exports !== "undefined")
	module.exports = SpaceifyConfig;