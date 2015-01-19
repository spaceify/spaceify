#!/usr/bin/env node
/**
 * Connection hub, 11.12.2013 Spaceify Inc.
 * 
 * Common hub for connecting clients and spacelets.
 * - Clients (web browsers) connect to the hub using a engine.io connection
 * - Spacelets, sandboxed applications and native applications connect to the hub using a WebSocket connection
 * - Connections are then piped: client | hub | spacelet.
 * The hub enables easy and secure origin checks and killing of misbehaving spacelets.
 */

// INCLUDES
var fs = require("fs");
var http = require("http");
var fibrous = require("fibrous");
var engineio = require("engine.io");
var logger = require("./logger");
var Config = require("./config")();
var Const = require("./constants");
var Utility = require("./utility");
var Language = require("./language");
var WebSocketClient = require("./websocketclient");
var EngineIoRPCServer = require("./engineiorpcserver");
var WebSocketRPCServer = require("./websocketrpcserver");

/**
 * @class ConnectionHub
 */

function ConnectionHub()
{
var self = this;

var options = {};
var pipeId = 0;
var pipes = new Object();
var socketRPCServer = new EngineIoRPCServer();
var webSocketRPCServer = new WebSocketRPCServer();
var secureSocketRPCServer = new EngineIoRPCServer();
var secureWebSocketRPCServer = new WebSocketRPCServer();

self.connect = fibrous( function(opts, core)
	{
	options.hostname = opts.hostname || "";
	options.webSocketPorts = opts.webSocketPorts || {"http": "", "https": ""};
	options.socketPorts = opts.socketPorts || {"http": "", "https": ""};
	options.core = core;

	websocketConnect.sync();
	socketConnect.sync();
	});

self.close = fibrous( function()
	{
	webSocketRPCServer.sync.close();
	socketRPCServer.sync.close();

	secureWebSocketRPCServer.sync.close();
	secureSocketRPCServer.sync.close();
	});

var websocketConnect = fibrous( function()
	{
	webSocketRPCServer.exposeRPCMethod("startSpacelet", self, options.core.startSpacelet);
	webSocketRPCServer.exposeRPCMethod("findService", self, options.core.findService);
	webSocketRPCServer.exposeRPCMethod("registerService", self, options.core.registerService);
	webSocketRPCServer.exposeRPCMethod("unregisterService", self, options.core.unRegisterService);
	webSocketRPCServer.exposeRPCMethod("initialized", self, options.core.initialized);
	webSocketRPCServer.exposeRPCMethod("setSplashAccepted", self, options.core.setSplashAccepted);
	webSocketRPCServer.exposeRPCMethod("startApplication", self, options.core.startApplication);
	webSocketRPCServer.exposeRPCMethod("stopApplication", self, options.core.stopApplication);
	webSocketRPCServer.exposeRPCMethod("isApplicationRunning", self, options.core.isApplicationRunning);
	webSocketRPCServer.exposeRPCMethod("getApplicationData", self, options.core.getApplicationData);
	webSocketRPCServer.connect.sync({hostname: options.hostname, port: options.webSocketPorts.http, isSsl: false, owner: "ConnectionHub"});

	secureWebSocketRPCServer.exposeRPCMethod("startSpacelet", self, options.core.startSpacelet);
	secureWebSocketRPCServer.exposeRPCMethod("findService", self, options.core.findService);
	secureWebSocketRPCServer.exposeRPCMethod("registerService", self, options.core.registerService);
	secureWebSocketRPCServer.exposeRPCMethod("unregisterService", self, options.core.unRegisterService);
	secureWebSocketRPCServer.exposeRPCMethod("initialized", self, options.core.initialized);
	secureWebSocketRPCServer.exposeRPCMethod("setSplashAccepted", self, options.core.setSplashAccepted);
	secureWebSocketRPCServer.exposeRPCMethod("startApplication", self, options.core.startApplication);
	secureWebSocketRPCServer.exposeRPCMethod("stopApplication", self, options.core.stopApplication);
	secureWebSocketRPCServer.exposeRPCMethod("isApplicationRunning", self, options.core.isApplicationRunning);
	secureWebSocketRPCServer.exposeRPCMethod("getApplicationData", self, options.core.getApplicationData);
	// THESE ARE EXPOSED ONLY OVER A SECURE CONNECTION!!!
	secureWebSocketRPCServer.exposeRPCMethod("adminLogIn", self, options.core.adminLogIn);
	secureWebSocketRPCServer.exposeRPCMethod("adminLogOut", self, options.core.adminLogOut);
	secureWebSocketRPCServer.exposeRPCMethod("isAdminAuthenticated", self, options.core.isAdminAuthenticated);
	secureWebSocketRPCServer.exposeRPCMethod("applyOptions", self, options.core.applyOptions);
	secureWebSocketRPCServer.exposeRPCMethod("saveOptions", self, options.core.saveOptions);
	secureWebSocketRPCServer.exposeRPCMethod("loadOptions", self, options.core.loadOptions);
	// THESE ARE EXPOSED ONLY OVER A SECURE CONNECTION!!!
	var key = fs.sync.readFile(Config.SSL_PATH_KEY);
	var cert = fs.sync.readFile(Config.SSL_PATH_CERT);
	secureWebSocketRPCServer.connect.sync({hostname: options.hostname, port: options.webSocketPorts.https, isSsl: true, sslKey: key, sslCert: cert, owner: "ConnectionHub"});
	});

var socketConnect = fibrous( function()
	{
	socketRPCServer.exposeRPCMethod("startSpacelet", self, options.core.startSpacelet);
	socketRPCServer.exposeRPCMethod("findService", self, options.core.findService);
	socketRPCServer.exposeRPCMethod("registerService", self, options.core.registerService);
	socketRPCServer.exposeRPCMethod("unregisterService", self, options.core.unRegisterService);
	socketRPCServer.exposeRPCMethod("initialized", self, options.core.initialized);
	socketRPCServer.exposeRPCMethod("setSplashAccepted", self, options.core.setSplashAccepted);
	socketRPCServer.exposeRPCMethod("startApplication", self, options.core.startApplication);
	socketRPCServer.exposeRPCMethod("stopApplication", self, options.core.stopApplication);
	socketRPCServer.exposeRPCMethod("isApplicationRunning", self, options.core.isApplicationRunning);
	socketRPCServer.exposeRPCMethod("getApplicationData", self, options.core.getApplicationData);
	socketRPCServer.exposeRPCMethod("connectTo", self, connectTo);
	socketRPCServer.connect.sync({hostname: options.hostname, port: options.socketPorts.http, isSsl: false, owner: "ConnectionHub"});

	secureSocketRPCServer.exposeRPCMethod("startSpacelet", self, options.core.startSpacelet);
	secureSocketRPCServer.exposeRPCMethod("findService", self, options.core.findService);
	secureSocketRPCServer.exposeRPCMethod("registerService", self, options.core.registerService);
	secureSocketRPCServer.exposeRPCMethod("unregisterService", self, options.core.unRegisterService);
	secureSocketRPCServer.exposeRPCMethod("initialized", self, options.core.initialized);
	secureSocketRPCServer.exposeRPCMethod("setSplashAccepted", self, options.core.setSplashAccepted);
	secureSocketRPCServer.exposeRPCMethod("startApplication", self, options.core.startApplication);
	secureSocketRPCServer.exposeRPCMethod("stopApplication", self, options.core.stopApplication);
	secureSocketRPCServer.exposeRPCMethod("isApplicationRunning", self, options.core.isApplicationRunning);
	secureSocketRPCServer.exposeRPCMethod("getApplicationData", self, options.core.getApplicationData);
	secureSocketRPCServer.exposeRPCMethod("connectTo", self, connectTo);
	// THESE ARE EXPOSED ONLY OVER A SECURE CONNECTION!!!
	secureSocketRPCServer.exposeRPCMethod("adminLogIn", self, options.core.adminLogIn);
	secureSocketRPCServer.exposeRPCMethod("adminLogOut", self, options.core.adminLogOut);
	secureSocketRPCServer.exposeRPCMethod("isAdminAuthenticated", self, options.core.isAdminAuthenticated);
	secureSocketRPCServer.exposeRPCMethod("applyOptions", self, options.core.applyOptions);
	secureSocketRPCServer.exposeRPCMethod("saveOptions", self, options.core.saveOptions);
	secureSocketRPCServer.exposeRPCMethod("loadOptions", self, options.core.loadOptions);
	// THESE ARE EXPOSED ONLY OVER A SECURE CONNECTION!!!
	var key = fs.sync.readFile(Config.SSL_PATH_KEY);
	var cert = fs.sync.readFile(Config.SSL_PATH_CERT);
	secureSocketRPCServer.connect.sync({hostname: options.hostname, port: options.socketPorts.https, isSsl: true, sslKey: key, sslCert: cert, owner: "ConnectionHub"});
	});

/* JSON-RPC AND RELATED */
var connectTo = fibrous( function(hostdata, isSsl)
	{
	try {
		var websocket = new WebSocketClient();
		var res = websocket.connect.sync({hostname: null, port: hostdata.port, isSsl: isSsl, owner: "ConnectionHub"});

		pipeId++;
		pipes[pipeId] = {};
		pipes[pipeId].websocket = websocket;
		pipes[pipeId].connectionId = arguments[arguments.length - 1].id;
		pipes[pipeId].pipeId = pipeId;
		pipes[pipeId].ip = hostdata.ip;
		pipes[pipeId].port = hostdata.port;
		pipes[pipeId].isSsl = isSsl;

		(!isSsl ? socketRPCServer : secureSocketRPCServer).pipe(pipes[pipeId], connectClose, websocket.sendMessage);
		websocket.pipe(pipes[pipeId], connectClose, (!isSsl ? socketRPCServer.sendStringMessage : secureSocketRPCServer.sendStringMessage));
		}
	catch(err)
		{
		throw Utility.ferror(false, Language.E_CONNECTIONHUB_CONNECTO.p("ConnectionHub::connectTo()"), {":ip": hostdata.ip, ":port": hostdata.port, ":err": err.toString()});
		}
// poista sertifikaatti ja avain poistettaessa appia
	return true;
	});

var connectClose = function(pipeId)
	{
	if(!pipes[pipeId])																// Prevent multiple close calls
		return;

	// ToDo: kill spacelet (or sandboxedapp or nativeapp)

	pipes[pipeId].websocket.close();
	(!pipes[pipeId].isSsl ? socketRPCServer : secureSocketRPCServer).closeConnection(pipes[pipeId].connectionId);

	delete pipes[pipeId];
	}

}

module.exports = ConnectionHub;
