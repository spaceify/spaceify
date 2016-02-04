/**
 * Spacelet by Spaceify Inc. 24.1.2016
 *
 * class @Spacelet
 */

function Spacelet()
{
var self = this;

var core = new SpaceifyCore();
var spaceifyService = new SpaceifyService();

self.start = function(unique_name, callback)
	{
	try {
		core.startSpacelet(unique_name, function(err, serviceobj)									// Returns only services where type is open
			{
			if(err)
				callback(err, false);
			else
				{
				spaceifyService.connectServices(serviceobj.service_names, function()
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
