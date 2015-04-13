#!/usr/bin/env node
/**
 * SpaceifyError, 4.6.2014 Spaceify Inc.
 */

function SpaceifyError(params)
{
var self = this;

self.path = params.path || "";
self.code = params.code || "";
self.message = params.message || "";

self.p = function(path)
	{
	self.path = path;

	return self.getAsObject();
	}

self.getAsObject = function()
	{
	return {path: self.path, code: self.code, message: self.message};
	}

self.getMessage = function()
	{
	return self.message;
	}

self.getCode = function()
	{
	return self.code;
	}

self.getPath = function()
	{
	return self.path;
	}
}

module.exports = SpaceifyError;
