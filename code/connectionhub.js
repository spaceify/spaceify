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
	webSocketRPCServer.exposeMethod("startSpacelet", self, options.core.startSpacelet);
	webSocketRPCServer.exposeMethod("getService", self, options.core.getService);
	webSocketRPCServer.exposeMethod("getServices", self, options.core.getServices);
	webSocketRPCServer.exposeMethod("registerService", self, options.core.registerService);
	webSocketRPCServer.exposeMethod("unregisterService", self, options.core.unRegisterService);
	webSocketRPCServer.exposeMethod("initialized", self, options.core.initialized);
	webSocketRPCServer.exposeMethod("setSplashAccepted", self, options.core.setSplashAccepted);
	webSocketRPCServer.exposeMethod("startApplication", self, options.core.startApplication);
	webSocketRPCServer.exposeMethod("stopApplication", self, options.core.stopApplication);
	webSocketRPCServer.exposeMethod("removeApplication", self, options.core.removeApplication);
	webSocketRPCServer.exposeMethod("isApplicationRunning", self, options.core.isApplicationRunning);
	webSocketRPCServer.exposeMethod("getApplicationData", self, options.core.getApplicationData);
	webSocketRPCServer.exposeMethod("getManifest", self, options.core.getManifest);
	webSocketRPCServer.connect.sync({hostname: options.hostname, port: options.webSocketPorts.http, owner: "ConnectionHub"});

	secureWebSocketRPCServer.exposeMethod("startSpacelet", self, options.core.startSpacelet);
	secureWebSocketRPCServer.exposeMethod("getService", self, options.core.getService);
	secureWebSocketRPCServer.exposeMethod("getServices", self, options.core.getServices);
	secureWebSocketRPCServer.exposeMethod("registerService", self, options.core.registerService);
	secureWebSocketRPCServer.exposeMethod("unregisterService", self, options.core.unRegisterService);
	secureWebSocketRPCServer.exposeMethod("initialized", self, options.core.initialized);
	secureWebSocketRPCServer.exposeMethod("setSplashAccepted", self, options.core.setSplashAccepted);
	secureWebSocketRPCServer.exposeMethod("startApplication", self, options.core.startApplication);
	secureWebSocketRPCServer.exposeMethod("stopApplication", self, options.core.stopApplication);
	secureWebSocketRPCServer.exposeMethod("removeApplication", self, options.core.removeApplication);
	secureWebSocketRPCServer.exposeMethod("isApplicationRunning", self, options.core.isApplicationRunning);
	secureWebSocketRPCServer.exposeMethod("getApplicationData", self, options.core.getApplicationData);
	secureWebSocketRPCServer.exposeMethod("getManifest", self, options.core.getManifest);
	// THESE ARE EXPOSED ONLY OVER A SECURE CONNECTION!!!
	secureWebSocketRPCServer.exposeMethod("adminLogIn", self, options.core.adminLogIn);
	secureWebSocketRPCServer.exposeMethod("adminLogOut", self, options.core.adminLogOut);
	secureWebSocketRPCServer.exposeMethod("isAdminLoggedIn", self, options.core.isAdminLoggedIn);
	secureWebSocketRPCServer.exposeMethod("saveOptions", self, options.core.saveOptions);
	secureWebSocketRPCServer.exposeMethod("loadOptions", self, options.core.loadOptions);
	// THESE ARE EXPOSED ONLY OVER A SECURE CONNECTION!!!
	var key = Config.SPACEIFY_TLS_PATH + Const.SERVER_KEY;
	var crt = Config.SPACEIFY_TLS_PATH + Const.SERVER_CRT;
	var ca_crt = Config.SPACEIFY_WWW_PATH + Const.SPACEIFY_CRT;
	secureWebSocketRPCServer.connect.sync({hostname: options.hostname, port: options.webSocketPorts.https, is_secure: true, key: key, crt: crt, ca_crt: ca_crt, owner: "ConnectionHub"});
	});

var socketConnect = fibrous( function()
	{
	socketRPCServer.exposeMethod("startSpacelet", self, options.core.startSpacelet);
	socketRPCServer.exposeMethod("getService", self, options.core.getService);
	socketRPCServer.exposeMethod("getServices", self, options.core.getServices);
	socketRPCServer.exposeMethod("registerService", self, options.core.registerService);
	socketRPCServer.exposeMethod("unregisterService", self, options.core.unRegisterService);
	socketRPCServer.exposeMethod("initialized", self, options.core.initialized);
	socketRPCServer.exposeMethod("setSplashAccepted", self, options.core.setSplashAccepted);
	socketRPCServer.exposeMethod("startApplication", self, options.core.startApplication);
	socketRPCServer.exposeMethod("stopApplication", self, options.core.stopApplication);
	socketRPCServer.exposeMethod("removeApplication", self, options.core.removeApplication);
	socketRPCServer.exposeMethod("isApplicationRunning", self, options.core.isApplicationRunning);
	socketRPCServer.exposeMethod("getApplicationData", self, options.core.getApplicationData);
	socketRPCServer.exposeMethod("getManifest", self, options.core.getManifest);
	socketRPCServer.exposeMethod("connectTo", self, connectTo);
	socketRPCServer.connect.sync({hostname: options.hostname, port: options.socketPorts.http, owner: "ConnectionHub"});

	secureSocketRPCServer.exposeMethod("startSpacelet", self, options.core.startSpacelet);
	secureSocketRPCServer.exposeMethod("getService", self, options.core.getService);
	secureSocketRPCServer.exposeMethod("getServices", self, options.core.getServices);
	secureSocketRPCServer.exposeMethod("registerService", self, options.core.registerService);
	secureSocketRPCServer.exposeMethod("unregisterService", self, options.core.unRegisterService);
	secureSocketRPCServer.exposeMethod("initialized", self, options.core.initialized);
	secureSocketRPCServer.exposeMethod("setSplashAccepted", self, options.core.setSplashAccepted);
	secureSocketRPCServer.exposeMethod("startApplication", self, options.core.startApplication);
	secureSocketRPCServer.exposeMethod("stopApplication", self, options.core.stopApplication);
	secureSocketRPCServer.exposeMethod("removeApplication", self, options.core.removeApplication);
	secureSocketRPCServer.exposeMethod("isApplicationRunning", self, options.core.isApplicationRunning);
	secureSocketRPCServer.exposeMethod("getApplicationData", self, options.core.getApplicationData);
	secureSocketRPCServer.exposeMethod("getManifest", self, options.core.getManifest);
	secureSocketRPCServer.exposeMethod("connectTo", self, connectTo);
	// THESE ARE EXPOSED ONLY OVER A SECURE CONNECTION!!!
	secureSocketRPCServer.exposeMethod("adminLogIn", self, options.core.adminLogIn);
	secureSocketRPCServer.exposeMethod("adminLogOut", self, options.core.adminLogOut);
	secureSocketRPCServer.exposeMethod("isAdminLoggedIn", self, options.core.isAdminLoggedIn);
	secureSocketRPCServer.exposeMethod("saveOptions", self, options.core.saveOptions);
	secureSocketRPCServer.exposeMethod("loadOptions", self, options.core.loadOptions);
	// THESE ARE EXPOSED ONLY OVER A SECURE CONNECTION!!!
	var key = Config.SPACEIFY_TLS_PATH + Const.SERVER_KEY;
	var crt = Config.SPACEIFY_TLS_PATH + Const.SERVER_CRT;
	var ca_crt = Config.SPACEIFY_WWW_PATH + Const.SPACEIFY_CRT;
	secureSocketRPCServer.connect.sync({hostname: options.hostname, port: options.socketPorts.https, is_secure: true, key: key, crt: crt, ca_crt: ca_crt, owner: "ConnectionHub"});
	});

/* JSON-RPC AND RELATED */
var connectTo = fibrous( function(service, is_secure)
	{
	try {
		var port = (!is_secure ? service.port : service.secure_port);

		var websocket = new WebSocketClient();
		var res = websocket.connect.sync({hostname: null, port: port, is_secure: is_secure, owner: "ConnectionHub"});

		pipeId++;
		pipes[pipeId] = {};
		pipes[pipeId].websocket = websocket;
		pipes[pipeId].connectionId = arguments[arguments.length - 1].id;
		pipes[pipeId].pipeId = pipeId;
		pipes[pipeId].ip = service.ip;
		pipes[pipeId].port = port;
		pipes[pipeId].is_secure = is_secure;

		(!is_secure ? socketRPCServer : secureSocketRPCServer).pipe(pipes[pipeId], connectClose, websocket.sendMessage);
		websocket.pipe(pipes[pipeId], connectClose, (!is_secure ? socketRPCServer.sendStringMessage : secureSocketRPCServer.sendStringMessage));
		}
	catch(err)
		{
		throw Utility.ferror(Language.E_CONNECTIONHUB_CONNECTO.p("ConnectionHub::connectTo()"), {":ip": service.ip, ":port": port, ":err": err.toString()});
		}

	return true;
	});

var connectClose = function(pipeId)
	{
	if(!pipes[pipeId])																// Prevent multiple close calls
		return;

	// ToDo: kill spacelet (or sandboxed or native)

	pipes[pipeId].websocket.close();
	(!pipes[pipeId].is_secure ? socketRPCServer : secureSocketRPCServer).closeConnection(pipes[pipeId].connectionId);

	delete pipes[pipeId];
	}

}

module.exports = ConnectionHub;
