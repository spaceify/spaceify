/**
 * Spacelet by Spaceify Inc. 24.1.2016
 *
 * class @Spacelet
 */

function Spacelet()
{
var self = this;

var connectionListener = null;
var disconnectionListener = null;

var core = new SpaceifyCore();
var utility = new SpaceifyUtility();
var services = new SpaceifyService();

self.start = function(unique_name, callback)
	{
	try {
		core.startSpacelet(unique_name, function(err, serviceobj)
			{
			if(err)
				callback(err, false);
			else
				{
				services.connectServices(serviceobj.service_names, function()
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
	return services.getRequiredService(service_name);
	}

self.getRequiredServiceSecure = function(service_name)
	{
	return services.getRequiredServiceSecure(service_name);
	}

}
