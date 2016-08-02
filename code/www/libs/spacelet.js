"use strict";

/**
 * Spacelet, 24.1.2016 Spaceify Oy
 *
 * class @Spacelet
 */

function Spacelet()
{
var self = this;

var core = new SpaceifyCore();
var spaceifyService = new SpaceifyService();

self.start = function(application, unique_name, callback)
	{ // callback takes preference over application context
	try {
		core.startSpacelet(unique_name, function(err, serviceobj)
			{
			if(err)
				throw err;
			else
				{
				for(var i = 0; i < serviceobj.serviceNames.length; i++)
					{
					spaceifyService.connect(serviceobj.serviceNames[i], (i + 1 != serviceobj.serviceNames.length ? null : function(err, data)
						{
						if(typeof application == "function")
							application(null, true);
						else if(application && application.start)
							application.start();
						}));
					}
				}
			});
		}
	catch(err)
		{
		if(typeof application == "function")
			application(err, false);
		else if(application && application.fail)
			application.fail(err);
		}
	}

self.getRequiredService = function(service_name)
	{
	return spaceifyService.getRequiredService(service_name);
	}

self.getRequiredServiceSecure = function(service_name)
	{
	return spaceifyService.getRequiredServiceSecure(service_name);
	}

}
