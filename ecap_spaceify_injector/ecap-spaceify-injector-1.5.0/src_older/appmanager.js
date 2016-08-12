/**
 * AppManager, 9.1.2014, Spaceify Inc.
 * 
 * @class AppManager
 */

// INCLUDES
var fs = require("fs");
var http = require("http");
var AdmZip = require("adm-zip");
var logger = require('winston');
var fibrous = require("fibrous");
var Config = require("./config");
var Const = require("./constants");
var Utility = require("./utility");
var Database = require("./database");
var WebSocketCommunicator = require("./websocketcommunicator");

function AppManager()
{
var self = this;

var opts = {};
var utility = new Utility();
var database = new Database();
var websocketCommunicator = new WebSocketCommunicator();
var secureWebsocketCommunicator = new WebSocketCommunicator();

self.listen = fibrous( function(host, ports, protocol)
	{
	opts.host = host;
	opts.ports = ports;
	opts.protocol = protocol;

	websocketCommunicator.exposeRPCMethod("loadApplication", self, self.loadApplication);
	websocketCommunicator.exposeRPCMethod("updateSettings", self, self.updateSettings);
	websocketCommunicator.listen.sync(opts.host, opts.ports.http, opts.protocol, false);
	logger.info("AppManager WebSocket (HTTP) listening at " + opts.host + ":" + opts.ports.http + "/" + opts.protocol);

	secureWebsocketCommunicator.exposeRPCMethod("loadApplication", self, self.loadApplication);
	secureWebsocketCommunicator.exposeRPCMethod("updateSettings", self, self.updateSettings);
	secureWebsocketCommunicator.listen.sync(opts.host, opts.ports.https, opts.protocol, true);
	logger.info("AppManager WebSocket (HTTPS) listening at " + opts.host + ":" + opts.ports.https + "/" + opts.protocol);
	});

self.close = fibrous( function()
	{
	websocketCommunicator.sync.close();

	secureWebsocketCommunicator.sync.close();
	});

/* EXPOSED JSON-RPC */
self.loadApplication = fibrous( function(appURL, appName, appType)
	{
	// LOAD AND PARSE MANIFEST
	var manifestFile;
	try {
		manifestFile = utility.sync.loadRemoteFile(appURL + "/" + appName + ".mf").body;
		}
	catch(err)
		{
		throw utility.makeError(Errors.E_FAILED_TO_LOAD_MANIFEST, "AppManager::loadApplication()", err);
		}

	var manifest;
	try {
		manifest = utility.parseManifest(manifestFile, appType);
		}
	catch(err)
		{
		throw utility.makeError(err, "AppManager::loadApplication()");
		}

	// LOAD FILE
	var localFile = "/tmp/" + appName + ".zip";
	try {
		utility.sync.loadRemoteFileToLocalFile(appURL + "/" + appName + ".zip", localFile);
		logger.info("AppManager::loadApplication(). Remote file loaded to /tmp/");
		}
	catch(err)
		{
		throw utility.makeError(Errors.E_FAILED_TO_LOAD_APPLICATION_FILE, "AppManager::loadApplication()", err);
		}

	// HANDLE FILE
	if(manifest[Const.MANIFEST_FIELD_TYPE] == Const.MANIFEST_TYPE_SPACELET)
		installSpacelet.sync(manifest, localFile);
	});

/* HANDLERS */
var installSpacelet = fibrous( function(manifest, localFile)
	{
	try {
		var name = manifest[Const.MANIFEST_FIELD_NAME];
		var inject_files = manifest[Const.MANIFEST_FIELD_INJECT_FILES];
		var inject_urls = manifest[Const.MANIFEST_FIELD_INJECT_URLS];

		utility.sync.deleteDirectory(Config.WORK_PATH + name);				// delete existing directories and files before creating new
		utility.sync.deleteDirectory(Config.INJECTS_PATH + name);
		utility.sync.deleteFile(Config.SPACELETS_PATH + name + ".zip");

		var zip = new AdmZip(localFile);									// extract the archive (sync doesn't work?)
		zip.extractAllTo(Config.WORK_PATH, true);

		utility.sync.copyDirectory(Config.WORK_PATH + name + Const.ARCHIVE_INJECTS_DIR, Config.INJECTS_PATH + name + "/");	// copy inject and resource files to this spacelets www/inject/<name> folder
		utility.sync.copyDirectory(Config.WORK_PATH + name + Const.ARCHIVE_RESOURCES_DIR, Config.INJECTS_PATH + name + "/");

		utility.sync.copyFile(Config.WORK_PATH + name + "/" + name + ".mf", Config.SPACELETS_PATH + name + ".mf");			// copy spacelets manifest to www/spaceify/ folder

		/*var spaceletzip = new AdmZip();									// make a local spacelet ziparchive to www/spaceify/<name>.zip from the content of <name>.zip/<name> folder
		spaceletzip.addLocalFolder(Config.WORK_PATH + name + "/" + name, name + "/");
		spaceletzip.writeZip(Config.SPACELETS_PATH + name + ".zip");*/				// amd-zip 0.4.3 writes flat archives!?
		utility.sync.zipDirectory(Config.WORK_PATH + name + "/" + name + "/", name, Config.SPACELETS_PATH + name + ".zip");

		var inject_text = "";
		for(i in inject_files)
			{
			var directory = inject_files[i][Const.MANIFEST_FIELD_DIRECTORY];
			var filename = inject_files[i][Const.MANIFEST_FIELD_NAME];
			var filetype = inject_files[i][Const.MANIFEST_FIELD_TYPE];
			var encoding = inject_files[i][Const.MANIFEST_FIELD_ENCODING];
			var filetext = fs.sync.readFile(Config.INJECTS_PATH + name + (directory != "" ? "/" + directory : "") + "/" + filename, encoding);

			if(filetype == Const.MANIFEST_VALUE_JAVASCRIPT)
				inject_text += '<script type="text/javascript">\n' + filetext + "</script>\n\n";
			else if(filetype == Const.MANIFEST_VALUE_CSS)
				inject_text += '<style>\n' + filetext + "</style>\n\n";
			else if(filetype == Const.MANIFEST_VALUE_TEXT)
				inject_text += filetext;
			}

		database.sync.open();
		var version = manifest[Const.MANIFEST_FIELD_VERSION];
		var type = manifest[Const.MANIFEST_FIELD_TYPE];
		var inject_identifier = manifest[Const.MANIFEST_FIELD_INJECT_IDENTIFIER];
		var obj = database.sync.getApplication([name]);
		if(typeof obj == "undefined")
			database.sync.insertApplication([name, version, type, inject_identifier, inject_text, "1"], inject_urls);
		else
			database.sync.updateApplication([version, inject_identifier, inject_text, obj.id], inject_urls);
		}
	catch(err)
		{
		throw utility.makeError(Errors.E_FAILED_TO_INSTALL_APPLICATION, "AppManager::installSpacelet()", err);
		}
	finally
		{
		database.sync.close();
		}

	});

self.updateSettings = fibrous( function(settings)
	{
	try {
		var inject_spaceifyclient  = '<script type="text/javascript">\n' + fs.sync.readFile(Config.WWW_PATH + "engine.io.js", "utf-8") + "</script>\n\n";
			inject_spaceifyclient += '<script type="text/javascript">\n' + fs.sync.readFile(Config.WWW_PATH + "spaceifyclient.js", "utf-8") + "</script>\n\n";

		database.sync.open();
		database.sync.updateSettings([inject_spaceifyclient]);
		}
	catch(err)
		{
		throw utility.makeError(Errors.E_FAILED_TO_UPDATE_SETTINGS, "AppManager::installSpacelet()", err);
		}
	finally
		{
		database.sync.close();
		}
	});

/*
Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number:
            03:1b:f9:87:c0:6c:ee:6d:01:d8:ed:ba:86:5a:b8:b4:f3:7c:96:24
    Signature Algorithm: sha1WithRSAEncryption
        Issuer: C=FI, O=Spaceify Inc., OU=Root CA, CN=Spaceify Root CA
        Validity
            Not Before: Aug 13 00:40:51 2013 GMT
            Not After : Aug 13 00:40:51 2016 GMT
        Subject: OU=Domain Control Validated, CN=livepassdl.conviva.com
        Subject Public Key Info:
            Public Key Algorithm: rsaEncryption
                Public-Key: (4096 bit)
                Modulus:
                    00:ae:91:98:2b:b3:d8:5b:02:60:f9:98:fd:4a:62:
                    e4:8f:b4:b9:07:97:3c:89:87:c9:01:00:76:d6:d0:
                    bc:c2:8e:28:e0:5f:05:3b:13:fe:c6:95:52:92:5f:
                    39:1c:73:3c:60:0c:a5:3b:8c:76:6a:6a:00:ce:0d:
                    4e:dd:dd:68:3d:d1:7b:4c:1b:d7:22:25:bc:87:f0:
                    35:85:d8:bc:f6:0f:ef:9e:8f:a7:8f:88:c0:cb:4a:
                    64:a4:f2:20:a3:7d:e8:9e:ef:46:20:f4:b6:80:af:
                    d7:e1:2f:60:3a:28:0c:33:11:65:dc:1c:7b:51:03:
                    1d:ae:c5:39:30:28:cb:e2:b7:37:5b:26:b8:ee:7e:
                    ed:33:56:90:82:a9:00:e3:ab:93:98:ca:3b:fb:5c:
                    7c:7c:e8:d7:45:bd:a6:db:2f:89:9a:5a:a9:ff:a5:
                    24:14:78:ef:2b:86:25:66:cc:44:f7:cf:dd:9a:75:
                    f4:9a:02:5b:48:ee:55:a7:fe:f8:84:62:b4:8a:50:
                    fb:11:dd:b5:6a:6a:91:e9:fa:fa:3e:a9:29:68:bb:
                    9f:d0:88:e4:f4:c3:37:1d:05:ad:39:fd:9d:db:11:
                    d1:96:76:13:be:99:05:cb:aa:29:db:cb:ed:51:70:
                    e3:00:a9:64:53:8b:e6:32:3c:79:00:d5:48:f3:c2:
                    46:c7:dd:0a:3d:a0:d1:6b:f3:44:cc:3f:3d:59:ca:
                    92:ec:cc:91:b2:27:9f:89:39:23:2a:61:a3:a5:1e:
                    2f:fc:46:92:70:5b:bb:cd:aa:75:89:da:be:a4:20:
                    dc:19:8d:6f:63:07:1f:2f:ea:6c:5f:9c:9a:fb:e6:
                    8a:4e:0d:b6:40:40:91:e4:b4:ba:b2:94:aa:36:a0:
                    3c:d6:fd:44:54:1e:fa:61:e5:b1:81:80:62:ef:e7:
                    88:fd:63:86:f0:59:48:a7:80:7c:f2:5a:79:0e:85:
                    48:69:6a:e1:e3:f4:80:c2:0f:38:e0:65:c7:77:56:
                    7d:95:a2:6c:e3:ad:42:01:e0:8c:a9:e1:83:cd:5b:
                    65:c5:fa:2b:9a:31:f1:e1:74:02:a4:80:5b:35:d5:
                    0c:82:7e:c6:3c:b8:bb:33:9b:5a:aa:f7:c5:0a:11:
                    b7:08:79:74:09:56:52:c9:b3:69:36:55:ee:ca:16:
                    77:e5:46:44:e9:76:b4:ce:de:87:11:19:88:1b:7c:
                    39:c1:de:b4:ff:53:b8:00:8b:b3:b6:19:7b:0e:06:
                    2b:62:94:12:76:9b:99:1a:ce:cb:5c:b8:25:23:e4:
                    b5:5d:d8:89:a3:74:e4:15:17:be:f1:71:00:c7:38:
                    38:cc:f9:21:ff:68:f6:87:a9:1e:de:13:99:29:48:
                    c1:0b:9d
                Exponent: 65537 (0x10001)
        X509v3 extensions:
            X509v3 Subject Alternative Name: 
                DNS:livepassdl.conviva.com, DNS:www.livepassdl.conviva.com
            X509v3 Key Usage: critical
                Digital Signature, Key Encipherment
            X509v3 Extended Key Usage: 
                TLS Web Server Authentication, TLS Web Client Authentication
            X509v3 Basic Constraints: critical
                CA:FALSE
    Signature Algorithm: sha1WithRSAEncryption
         16:58:5e:20:c6:00:20:fe:20:a3:37:fc:34:c2:59:2c:74:da:
         d2:e4:42:b3:3b:2e:7a:96:77:e8:f6:90:67:2d:34:d4:e7:e2:
         33:c9:49:85:a6:f6:5f:d9:02:2c:3b:48:67:c9:4a:b8:91:a8:
         23:ec:ed:a0:d4:07:ef:2a:45:d9:fe:f1:45:81:70:18:ec:ae:
         a3:40:ae:bf:86:78:6c:4f:17:b5:bf:78:96:f7:1f:78:75:78:
         62:5e:48:8f:42:b2:8f:3b:94:fc:e4:40:77:b2:c2:b7:af:de:
         94:31:f3:f3:83:09:5d:19:b0:5b:9f:d3:3d:a3:a2:b0:de:d4:
         f0:8d:57:a2:c0:c1:31:e2:ba:39:02:1e:bc:9c:e0:f1:f5:47:
         28:7a:0c:dd:dc:17:77:b3:e9:4a:14:b4:7a:dc:4e:ab:47:b4:
         4d:86:00:f5:a8:da:c6:b8:07:b6:7f:7a:b9:81:80:4f:1c:74:
         bc:68:95:4b:1b:99:46:1d:25:10:ed:1c:11:8f:ac:97:b5:78:
         df:d9:9a:72:03:05:76:fd:32:89:c7:5f:d5:23:f4:66:b1:d1:
         c6:19:23:75:b9:ad:00:aa:2c:a0:e6:5c:de:92:de:61:5f:07:
         33:14:39:19:25:c9:dd:16:75:3e:19:34:b1:c7:7f:d2:28:3b:
         89:10:98:73:97:77:92:45:30:dc:86:ce:fb:b0:0c:a7:6a:51:
         3d:bb:7b:a9:59:8d:7a:fe:3e:7c:21:55:3a:0d:7c:25:7b:04:
         7f:29:04:59:78:19:77:53:7b:88:fd:93:93:28:c3:d3:70:a3:
         98:1f:77:67:a5:18:9c:98:bb:db:36:2b:ae:4e:83:66:19:be:
         5a:14:aa:20:57:73:0e:35:fd:a9:ed:44:51:dd:3d:f8:39:8a:
         66:23:df:6c:7a:16:68:93:d8:b0:d6:b4:c9:7f:a6:40:c9:b5:
         1c:6b:c8:97:ae:20:7a:b8:b8:8d:3e:30:6b:38:30:42:4a:47:
         54:49:57:c4:d9:4a:b7:f5:c7:8a:97:01:e8:53:fc:0b:e3:88:
         9c:75:e6:53:0b:d2:98:5b:0d:5a:d5:7e:4b:13:fc:8d:64:d8:
         03:17:34:ff:67:d4:72:43:cc:c0:f8:83:b1:e8:9d:63:59:c4:
         fc:40:f3:0b:20:bc:2b:55:d1:5f:06:b3:09:f5:34:7a:48:07:
         fc:c3:45:8d:4b:80:aa:bf:5a:d5:a3:a2:ee:3d:bb:68:96:c7:
         32:7d:5a:ad:10:00:e6:21:f0:eb:62:98:07:0c:9b:b6:62:82:
         a6:6d:c1:da:81:e7:52:bb:f4:d3:87:36:8d:08:c4:4d:00:52:
         50:4b:26:79:e8:9b:61:e1
*/
}

module.exports = new AppManager();
