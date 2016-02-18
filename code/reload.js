#!/usr/bin/env node
/**
 * Reload, 25.3.2014 Spaceify Inc.
 * 
 * Adapted from: https://gist.github.com/gleitz/6896099
 * 
 * @class Reload
 */

function Reload()
{
var self = this;

self.require = function(moduleName)
	{
	uncache(moduleName);
	return require(moduleName);
	}

var uncache = function(moduleName)
	{
	searchCache(moduleName, function(mod)
		{
		delete require.cache[mod.id];
		});
	};

var searchCache = function(moduleName, callback)
	{
	var mod = require.resolve(moduleName);

	if(mod && ((mod = require.cache[mod]) !== undefined))
		{
		(function run(mod)
			{
			mod.children.forEach(function (child)
				{
				run(child);
				});

			callback(mod);
			})(mod);
		}
	};
}

module.exports = new Reload();
