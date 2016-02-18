/**
 * SpaceifyApplication by Spaceify Inc. 24.1.2016
 *
 * class @SpaceifyApplication
 */

function SpaceifyApplication()
{
var self = this;

var core = new SpaceifyCore();
var config = new SpaceifyConfig();
var spaceifyService = new SpaceifyService();

self.connect = function(unique_names, callback)
	{
	try {
		if(unique_names.constructor !== Array)													// Single name or many names
			unique_names = [unique_names];

		core.getServices(unique_names, function(err, services)
			{
			if(err)
				callback(err, false);
			else
				{
				var service_names = [];
				for(var i=0; i<services.length; i++)
					{
					if(services[i].service_type == config.OPEN)
						service_names.push(services[i].service_name);
					}

				spaceifyService.connectServices(service_names, function()
					{
					callback(null, true);
					});
				}
			});
		}
	catch(err)
		{
		callback(err, null);
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
