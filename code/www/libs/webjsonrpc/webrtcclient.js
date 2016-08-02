"use strict";

navigator.getUserMedia = (	navigator.getUserMedia ||
							navigator.webkitGetUserMedia ||
							navigator.mozGetUserMedia ||
							navigator.msGetUserMedia);

function WebRtcClient(rtcConfig)
{
// NODE.JS / REAL SPACEIFY - - - - - - - - - - - - - - - - - - - -
var isNodeJs = (typeof exports !== "undefined" ? true : false);
var isRealSpaceify = (typeof process !== "undefined" ? process.env.IS_REAL_SPACEIFY : false);
var apiPath = (isNodeJs && isRealSpaceify ? "/api/" : "/var/lib/spaceify/code/");

var classes = 	{
				Logger: (isNodeJs ? require(apiPath + "logger") : Logger),
				SpaceifyConfig: (isNodeJs ? require(apiPath + "spaceifyconfig") : SpaceifyConfig),
				RpcCommunicator: (isNodeJs ? require(apiPath + "rpccommunicator") : RpcCommunicator),
				WebSocketConnection: (isNodeJs ? require(apiPath + "websocketconnection") : WebSocketConnection)
				};
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

var self = this;
var logger = new classes.Logger();
var config = new classes.SpaceifyConfig();
var communicator = new classes.RpcCommunicator();
var connection = new classes.WebSocketConnection();

var ownStream = null;
var connectionListener = null;
var rtcConnections = new Object();

self.setConnectionListener = function(lis)
	{
	connectionListener = lis;
	}

self.onIceCandidate = function(iceCandidate, partnerId)
	{
	logger.info("WebRtcClient::onIceCandidate - Got it, sending it to the other client");

	communicator.callRpc("offerIce", [iceCandidate, partnerId]);
	};

var createConnection = function(partnerId)
	{
	rtcConnections[partnerId] = new WebRtcConnection(rtcConfig);
	rtcConnections[partnerId].setPartnerId(partnerId);

	rtcConnections[partnerId].setIceListener(self);
	rtcConnections[partnerId].setStreamListener(self);
	rtcConnections[partnerId].setConnectionListener(self);
	rtcConnections[partnerId].setDataChannelListener(self);
	}

self.shutdown = function(e)
	{
	logger.info("WebRtcClient::onbeforeunload");

	for (var id in rtcConnections)
		{
		if (rtcConnections.hasOwnProperty(id))
			{
			rtcConnections[id].close();
			delete rtcConnections[id];
			}
		}
	}

// RPC methods

self.handleRtcOffer = function(descriptor, partnerId, connectionId)
	{
	logger.info("WebRtcClient::handleRtcOffer descriptor:", descriptor);

	if (!rtcConnections.hasOwnProperty(partnerId))
		{
		createConnection(partnerId);
		}

	rtcConnections[partnerId].onConnectionOfferReceived(descriptor, connectionId, function(answer)
		{
		logger.info("WebRtcClient::handleRtcOffer - onConnectionOfferReceived returned");

		communicator.callRpc("acceptConnectionOffer",[answer, partnerId]);
		});

	};

self.handleRtcAnswer = function(descriptor, partnerId, connectionId)
	{
	logger.info("WebRtcClient::handleRtcAnswer");

	rtcConnections[partnerId].onConnectionAnswerReceived(descriptor);
	};

self.handleIceCandidate = function(iceCandidate, partnerId, connectionId)
	{
	logger.info("WebRtcClient::handleIceCandidate");

	if (!rtcConnections.hasOwnProperty(partnerId))
		{
		createConnection(partnerId);
		}

	rtcConnections[partnerId].onIceCandidateReceived(iceCandidate);
	};

// Private methods

var connectToCoordinator = function(config, callback)
	{
	logger.info("WebRtcClient::connectToCoordinator", "> Websocket connecting to the coordinator");

	connection.connect(config, function()
		{
		logger.info("WebRtcClient::connectToCoordinator - Websocket Connected to the Coordinator");
		logger.info("> Creating RPCCommunicator for the Websocket");

		communicator.addConnection(connection);
		callback();
		});
	};

self.onDisconnected = function(partnerId)
	{
	logger.info("WebRtcClient::onDisconnected");

	if (rtcConnections.hasOwnProperty(partnerId))
		{
		var connection = rtcConnections[partnerId];
		connectionListener.onDisconnected(connection.getId());

		connection.close();
		delete rtcConnections[partnerId];
		}
	};

self.onDataChannelOpen = function(connection)
	{
	logger.info("WebRtcClient::onDataChannelOpen");

	connectionListener.addConnection(connection);
	};

self.onStream = function(stream, partnerId)
	{
	logger.info("WebRtcClient::onStream");
	};

self.onRemoveStream = function(stream, partnerId)
	{
	logger.info("WebRtcClient::onRemoveStream");

	self.onDisconnected(partnerId);
	};

var connectToPeers = function(announceId, callback)
	{
	logger.info("WebRtcClient::connectToPeers - Announcing to the Coordinator");

	communicator.callRpc("announce", [announceId], self, self.onPeerIdsArrived);
	};

//Callback of the connectToPeers RPC call

self.onPeerIdsArrived = function(err, data, id)
	{
	logger.info("WebRtcClient::onPeerIdsArrived - data.length:", data.length);

	var partnerId = 0;

	for (var i=0; i<data.length; i++)
		{
		partnerId = data[i];

		//Create a WebRTC connection and

		createConnection(partnerId);

		logger.info("WebRtcClient::onPeerIdsArrived - Trying to create offer to client id", partnerId);

		//Creating a connection offer

		rtcConnections[partnerId].createConnectionOffer(function(offer, peerId)
			{
			logger.info("WebRtcClient::onPeerIdsArrived - Offer created, sending it to the other client", peerId);

			communicator.callRpc("offerConnection", [offer, peerId]);
			});
		}

	if (data.length === 0)
		logger.info("> Announce returned 0 client ids, not connecting");
	};

self.run = function(config, callback)
	{
	logger.info("WebRtcClient::run");

	window.onbeforeunload = self.shutdown;

	communicator.exposeRpcMethod("handleRtcOffer", self, self.handleRtcOffer);
	communicator.exposeRpcMethod("handleRtcAnswer", self, self.handleRtcAnswer);
	communicator.exposeRpcMethod("handleIceCandidate", self, self.handleIceCandidate);

	connectToCoordinator(config, function()
		{
		logger.info("WebRtcClient::run - Connected to the coordinator");

		connectToPeers(config.announceId, function()
			{
			logger.info("WebRtcClient::run - connectToPeers returned");
			});

		if (callback)
			callback(communicator);
		});

	};
}