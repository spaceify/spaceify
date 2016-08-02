"use strict";

var RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
var RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;

function WebRtcConnection(rtcConfig)
{
// NODE.JS / REAL SPACEIFY - - - - - - - - - - - - - - - - - - - -
var isNodeJs = (typeof exports !== "undefined" ? true : false);
var isRealSpaceify = (typeof process !== "undefined" ? process.env.IS_REAL_SPACEIFY : false);
var apiPath = (isNodeJs && isRealSpaceify ? "/api/" : "/var/lib/spaceify/code/");

var classes = 	{
				Logger: (isNodeJs ? require(apiPath + "logger") : Logger),
				};
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

var self = this;

var logger = new classes.Logger();

var id = null;
var ownStream = null;
var partnerId = null;
var iceListener = null;
var streamListener = null;
var listener = null;
var eventListener = null;
var dataChannelListener = null;

var rtcOptions = { "optional": [{"DtlsSrtpKeyAgreement": true}] };

var peerConnection = new RTCPeerConnection(rtcConfig, rtcOptions);

var dataChannel = null;

// If we receive a data channel from somebody else, this gets called

peerConnection.ondatachannel = function(e)
	{
	var temp = e.channel || e; // Chrome sends event, FF sends raw channel

	logger.info("WebRtcConnection::peerConnection.ondatachannel", e);

	dataChannel = temp;
	dataChannel.binaryType = "arraybuffer";
	dataChannel.onopen = self.onDataChannelOpen;
	dataChannel.onmessage = self.onMessage;
	};

var onsignalingstatechange = function(state)
	{
	logger.info("WebRtcConnection::onsignalingstatechange", state);

	//if ( eventListener == "function" && peerConnection.signalingState == "closed")
	//	eventListener.onDisconnected(partnerId);
	}

var oniceconnectionstatechange = function(state)
	{
	logger.info("WebRtcConnection::oniceconnectionstatechange", state);

	if ( eventListener == "function" && (peerConnection.iceConnectionState == "disconnected" || peerConnection.iceConnectionState == "closed"))
		eventListener.onDisconnected(partnerId);
	};

var onicegatheringstatechange = function(state)
	{
	logger.info("WebRtcConnection::onicegatheringstatechange", state);
	};

var onIceCandidate = function(e)
	{
	logger.info("WebRtcConnection::onIceCanditate - partnerId:", partnerId, ", event:", e, "> iceListener was", iceListener);

	// A null ice canditate means that all canditates have been given
	if (e.candidate == null)
		{
		logger.info("> All Ice candidates listed");
		//iceListener.onIceCandidate(peerConnection.localDescription, partnerId);
		}
	else
		{
		iceListener.onIceCandidate(e.candidate, partnerId);
		}
	};

peerConnection.onsignalingstatechange = onsignalingstatechange;
peerConnection.oniceconnectionstatechange = oniceconnectionstatechange;
peerConnection.onicegatheringstatechange = onicegatheringstatechange;
peerConnection.onicecandidate = onIceCandidate;

self.close = function()
	{
	logger.info("WebRtcConnection::close");

	//peerConnection.removeStream(ownStream);
	dataChannel.close();
	if (peerConnection.signalingState != "closed")
		peerConnection.close();
	}

self.send = function(message)
	{
	try	{
		if (dataChannel.readyState == "open")
			dataChannel.send(message);
		}
	catch(err)
		{
		logger.error(err, true, true, logger.ERROR);
		}
	};

self.getBufferedAmount = function()
	{
	return dataChannel.bufferedAmount;
	};

self.sendBinary = function(data)
	{
	try	{
		if (dataChannel.readyState == "open")
			dataChannel.send(data);
		}
	catch(err)
		{
		logger.error(err, true, true, logger.ERROR);
		}
	};

self.onDataChannelClosed = function(e)
	{
	logger.info("WebRtcConnection::onDataChannelClosed", e);

	eventListener.onDisconnected(self);
	}

self.onDataChannelOpen = function(e)
	{
	logger.info("WebRtcConnection::onDataChannelOpen", e);

	dataChannel.binaryType = "arraybuffer";
	dataChannel.onclose = self.onDataChannelClosed;
	dataChannel.onmessage = self.onMessage;
	if (dataChannelListener)
		dataChannelListener.onDataChannelOpen(self);
	}

self.onMessage = function(message)
	{
	//logger.info("WebRtcConnection::onMessage", message.data);

	try	{
		if (listener)
			listener.onMessage(message.data, self);
		}
	catch(err)
		{
		logger.error(err, true, true, logger.ERROR);
		}
	};

self.setId = function(id_)
	{
	id = id_;
	//logger.info("WebRtcConnection::setId", id);
	};

self.getId = function()
	{
	//logger.info("WebRtcConnection::getId", id);

	return id;
	};

self.getPartnerId = function()
	{
	//logger.info("WebRtcConnection::getPartnerId", partnerId);

	return partnerId;
	};

self.setPartnerId = function(id_)
	{
	partnerId = id_;
	};

self.setDataChannelListener = function(lis)
	{
	dataChannelListener = lis;
	};

self.setListener = function(lis)
	{
	listener = lis;
	};

self.setIceListener = function(lis)
	{
	iceListener = lis;
	//peerConnection.onicecandidate = function(cand) {self.onIceCandidate(cand);};

	logger.info("WebRtcConnection::setIceListener", lis);
	};

self.setStreamListener = function(lis)
	{
	streamListener = lis;
	peerConnection.onaddstream = function(e) {self.onStream(e);};
	peerConnection.onremovestream = function(e) {self.onRemoveStream(e);};
	};

self.setEventListener = function(lis)
	{
	eventListener = lis;
	//peerConnection.onaddstream = function(e) {self.onStream(e);};
	};

self.onStream = function(e)
	{
	logger.info("WebRtcConnection::onStream", e);

	streamListener.onStream(e.stream, partnerId);
	}

self.onRemoveStream = function(e)
	{
	logger.info("WebRtcConnection::onStream", e);

	streamListener.onRemoveStream(e.stream, partnerId);
	}

self.addStream = function(stream)
	{
	ownStream = stream;
	peerConnection.addStream(stream);
	}

self.createConnectionOffer = function(callback)
	{
	var localDescription = null;

	dataChannel = peerConnection.createDataChannel("jsonrpcchannel", {reliable: true});
	dataChannel.binaryType = "arraybuffer";
	dataChannel.onopen = self.onDataChannelOpen;
	dataChannel.onmessage = self.onMessage;

	peerConnection.createOffer(function (desc)
		{
		logger.info("WebRtcConnection::peerConnectio.createOffer - Called its callback:", desc);

		localDescription = desc;

		/*
		peerConnection.onicecandidate = function(e)
			{
			logger.info(e.candidate);

			if (e.candidate == null)
				{
				logger.info("> All Ice candidates listed");

				//iceListener.onIceCandidate(peerConnection.localDescription, partnerId);
				callback(peerConnection.localDescription, partnerId);
				}
			};
		*/

		peerConnection.setLocalDescription(desc,
			function()
				{
				callback(peerConnection.localDescription, partnerId);
				},
			function(err)
				{ // "WebRtcConnection::createConnectionOffer - setLocalDescription error"
				logger.error(err, true, true, logger.ERROR);
				},
			{});
		},
		function(err)
			{
			logger.error(err, true, true, logger.ERROR);
			});
	};

//Interface for messages coming from the partner ove websocket

self.onConnectionAnswerReceived = function(descriptor)
	{
	logger.info("WebRtcConnection::onConnectionAnswerReceived, descriptor:", descriptor);

	peerConnection.setRemoteDescription(new RTCSessionDescription(descriptor), function()
		{
		logger.info("WebRtcConnection::onConnectionAnswerReceived() - setRemoteDescription returned OK");
		},
		function(err)
			{ // "WebRtcConnection::onConnectionAnswerReceived() setRemoteDescription returned error " + err
			logger.error(err, true, true, logger.ERROR);
			});

	};


self.onConnectionOfferReceived = function(descriptor, connectionId, callback)
	{
	logger.info("WebRtcConnection::onConnectionOfferReceived - Trying to set remote description");

	var desc = new RTCSessionDescription(descriptor);
	peerConnection.setRemoteDescription(desc, function()
		{
		logger.info("WebRtcConnection::onConnectionOfferReceived Remote description set");

		peerConnection.createAnswer(function (answer)
				{
				/*
				peerConnection.onicecandidate = function(e)
					{
					if (e.candidate == null)
						{
						logger.info("> All Ice candidates listed");

						//iceListener.onIceCandidate(peerConnection.localDescription, partnerId);
						callback(peerConnection.localDescription);
						}
					};
				*/
				peerConnection.setLocalDescription(answer, function ()
					{
					callback(peerConnection.localDescription);
					//callback(answer);
					},
					function(err)
						{
						logger.error(err, true, true, logger.ERROR);
						}
					);
				},
				function(err)
					{
					logger.error(err, true, true, logger.ERROR);
					});
		},
		function(err)
			{ // "WebRtcConnection::onConnectionOfferReceived setting remote description failed " + err
			logger.error(err, true, true, logger.ERROR);
			});

	};

self.onIceCandidateReceived = function(iceCandidate)
	{
	peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate),
			function()
				{
				logger.info("WebRtcConnection::onIceCandidateReceived - Adding Ice candidate succeeded");
				},
			function(err)
				{ // "WebRtcConnection::onIceCandidateReceived adding Ice candidate failed " + err
				logger.error(err, true, true, logger.ERROR);
				});
	};

// Dummy implementation for websocket compatibility

self.setPipedTo = function(targetId)
	{
	};

self.getPipedTo = function()
	{
	return null;
	};

}