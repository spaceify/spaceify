/**
 * Spaceify Messages by Spaceify Inc. 21.1.2016
 *
 * For Spaceify's internal use.
 *
 * @class SpaceifyMessages
 */

function SpaceifyMessages(messageCallback, readyCallback)
{
var self = this

var communicator = null;

var config = new SpaceifyConfig();
var network = new SpaceifyNetwork();
var _communicator = new Communicator();

self.connect = function(callback)
	{
	try {
		if(!messageCallback)
			throw "";

		network.POST_JSON(config.ACTION_URL, { action: "requestMessages" }, function(err, message_id)	// Request a message_id
			{
			if(err)
				throw "";
			else
				{
				connect( function(err, data)
					{
					if(err)
						throw "";

					communicator.setMessageListener(receive);											// Confirm that we are listening
					communicator.sendMessage(JSON.stringify({message_id: message_id}));

					callback(null, true);
					});
				}
			});
		}
	catch(err)
		{
		if(messageCallback)																				// Notify about the failure
			messageCallback(config.FAIL_MESSAGES);

		readyCallback();																				// Done with the messaging

		callback(null, null);																			// Return to caller
		}
	}

var connect = function(callback)
	{
	var port = config.APPMAN_PORT_WEBSOCKET_MESSAGE_SECURE;
	_communicator.connect({hostname: config.EDGE_IP, port: port, is_secure: true, persistent: true}, config.WEBSOCKETC, function(err, data, id, ms)
		{
		communicator = data;
		callback(err, data, id, ms);
		});
	}

var receive = function(message)
	{
	try {
		message = JSON.parse(message);

		if(message.message == config.END_OF_MESSAGES)
			throw "";
		else
			messageCallback(message.message);
		}
	catch(err)
		{
		if(err !== "")
			messageCallback("Exception: SpaceifyMessages::receive - Malformed message");

		communicator.close();
		communicator = null;

		readyCallback();
		}
	}

}

