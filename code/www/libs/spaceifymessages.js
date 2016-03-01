/**
 * Spaceify Messages by Spaceify Inc. 21.1.2016
 *
 * For Spaceify's internal use.
 *
 * @class SpaceifyMessages
 */

function SpaceifyMessages()
{
var self = this

var errors = [];
var messageCommunicator = null;

var config = new SpaceifyConfig();
var network = new SpaceifyNetwork();
var communicator = new Communicator(config.WEBSOCKET_COMMUNICATOR);
var readyCallback = null;
var messageCallback = null;

self.connect = function(_readyCallback, _messageCallback, callback)
	{
	readyCallback = _readyCallback;
	messageCallback = _messageCallback

	try {
		if(!messageCallback)
			throw "";

		errors = [];
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

					messageCommunicator.setMessageListener(receive);									// Confirm that we are listening
					messageCommunicator.sendMessage(JSON.stringify({message_id: message_id}));

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
	communicator.connect({hostname: config.EDGE_IP, port: port, is_secure: true, persistent: true}, function(err, data, id, ms)
		{
		messageCommunicator = data;
		callback(err, data, id, ms);
		});
	}

var receive = function(message)
	{
	try {
		message = JSON.parse(message);

		if(typeof message.message == "undefined")
			return;
		else if(message.message == config.END_OF_MESSAGES)
			throw "";
		else if(message.message.indexOf(config.END_OF_MESSAGES_ERROR) != -1)
			{
			errors = JSON.parse(message.message.replace(config.END_OF_MESSAGES_ERROR, ""));
			throw "";
			}
		else
			messageCallback(message.message);
		}
	catch(err)
		{
		if(err !== "")
			messageCallback("Exception: SpaceifyMessages::receive - Malformed message");

		messageCommunicator.close();
		messageCommunicator = null;

		readyCallback();
		}
	}

self.getErrors = function()
	{
	return errors;
	}

}

