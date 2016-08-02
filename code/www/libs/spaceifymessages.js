"use strict";

/**
 * Spaceify Messages, 21.1.2016 Spaceify Oy
 *
 * For Spaceify's internal use.
 *
 * @class SpaceifyMessages
 */

function SpaceifyMessages()
{
var self = this;

var errorc = new SpaceifyError();
var config = new SpaceifyConfig();
var utility = new SpaceifyUtility();
var network = new SpaceifyNetwork();
var messageConnection = new WebSocketConnection();

var messageId;
var errors = [];
var warnings = [];
var callerOrigin = null;
var managerOrigin = null;

	// CONSTANTS -- -- -- -- -- -- -- -- -- -- //
self.MESSAGE = 1;
self.MESSAGE_END = 2;
self.MESSAGE_ERROR = 3;
self.MESSAGE_WARNING = 4;
self.MESSAGE_NOTIFY = 5;
self.MESSAGE_ANSWER = 6;
self.MESSAGE_QUESTION = 7;
self.MESSAGE_CONFIRM = 8;
self.MESSAGE_TIMED_OUT = 9;

self.connect = function(managerOrigin_, callerOrigin_)
	{
	errors = [];
	warnings = [];
	callerOrigin = callerOrigin_;
	managerOrigin = managerOrigin_;

	if(!callerOrigin.message)
		return fail(errorc.makeErrorObject("sme1", "Message callback must be implemented.", "SpaceifyMessage::connect"));

	network.POST_JSON(config.OPERATION_URL, { type: "requestMessages" }, function(err, messageId_)					// Request a messageId
		{
		if(err)
			return fail(err);

		messageId = messageId_;

		messageConnection.setEventListener(self);

		messageConnection.connect({hostname: config.EDGE_HOSTNAME, port: config.APPMAN_MESSAGE_PORT_SECURE, isSecure: true}, function(err, data)
			{
			if(err)
				return fail(err);

			messageConnection.send(JSON.stringify({type: self.MESSAGE_CONFIRM, messageId: messageId}));	// Confirm that we are listening

			managerOrigin.success();
			});
		});
	}

var fail = function(err)
	{
	if(callerOrigin.fail)
		callerOrigin.fail(err);

	managerOrigin.fail(err);
	}

self.getErrors = function()
	{
	return errors;
	}

self.getWarnings = function()
	{
	return warnings;
	}

self.answer = function(answer, answerCallBackId)
	{
	if(!messageConnection)
		return;

	messageConnection.send(JSON.stringify({type: self.MESSAGE_ANSWER, messageId: messageId, answer: answer, answerCallBackId: answerCallBackId}));
	}

//** MessageListener interface implementation
//** EventListener interface implementation
self.onDisconnected = function(id) {}

self.onMessage = function(message, connection)
	{
	try {
		message = JSON.parse(message);

		if(message.type == self.MESSAGE_END)
			throw "";
		else if(message.type == self.MESSAGE_ERROR)
			errors.push(message.data);
		else if(message.type == self.MESSAGE_WARNING)
			{
			warning.push(message.data);
			if(callerOrigin.warning)
				callerOrigin.warning(message.data.message, message.data.code);
			}
		else if(message.type == self.MESSAGE_NOTIFY && callerOrigin.notify)
			callerOrigin.notify(message.data.message, message.data.code);
		else if(message.type == self.MESSAGE_QUESTION && callerOrigin.question)
			callerOrigin.question(message.message, message.choices, message.source, message.answerCallBackId);
		else if(message.type == self.MESSAGE_TIMED_OUT && callerOrigin.questionTimedOut)
			callerOrigin.questionTimedOut(message.message, message.source, message.answerCallBackId);
		else if(message.type == self.MESSAGE && callerOrigin.message)
			callerOrigin.message(message.message);
		}
	catch(err)
		{
		if(err !== "")
			errors.push(errorc.make(err));

		messageConnection.close();

		managerOrigin.ready(1);
		}
	}

}

