/**
 * AppManager, 9.1.2014, Spaceify Inc.
 * 
 * @class AppManager
 */

// INCLUDES
var fs = require("fs");
var url = require("url");
var http = require("http");
var mkdirp = require("mkdirp");
var Github = require("github");
var AdmZip = require("adm-zip");
var fibrous = require("fibrous");
var logger = require("./logger");
var Config = require("./config")();
var Utility = require("./utility");
var Language = require("./language");
var Database = require("./database");
var Application = require("./application");
var http_status = require("./httpstatus");
var ValidateApplication = require("./validateapplication");
var DockerImage = require("./dockerimage.js");
var DockerContainer = require("./dockercontainer.js");
var WebSocketRPCServer = require("./websocketrpcserver");
var WebSocketRPCClient = require("./websocketrpcclient");

function AppManager()
{
var self = this;

var options = {};
var database = new Database();
var spmRPCClient = null;
var coreRPCClient = new WebSocketRPCClient();
var webSocketRPCServer = new WebSocketRPCServer();
var secureWebSocketRPCServer = new WebSocketRPCServer();

var isLocked = false;																			// One operation at a time!

self.connect = fibrous( function(opts)
	{
	options.hostname = opts.hostname || "";
	options.ports = opts.ports || {"http": Config.APPMAN_PORT_WEBSOCKET, "https": Config.APPMAN_PORT_WEBSOCKET_SECURE};
	options.coreIsUp = false;

	webSocketRPCServer.exposeMethod("installApplication", self, self.installApplication);
	webSocketRPCServer.exposeMethod("removeApplication", self, self.removeApplication);
	webSocketRPCServer.exposeMethod("startApplication", self, self.startApplication);
	webSocketRPCServer.exposeMethod("stopApplication", self, self.stopApplication);
	webSocketRPCServer.exposeMethod("restartApplication", self, self.restartApplication);
	webSocketRPCServer.exposeMethod("listApplications", self, self.listApplications);
	webSocketRPCServer.exposeMethod("updateSettings", self, self.updateSettings);
	webSocketRPCServer.connect.sync({hostname: options.hostname, port: options.ports.http, owner: "AppManager"});

	secureWebSocketRPCServer.exposeMethod("installApplication", self, self.installApplication);
	secureWebSocketRPCServer.exposeMethod("removeApplication", self, self.removeApplication);
	secureWebSocketRPCServer.exposeMethod("startApplication", self, self.startApplication);
	secureWebSocketRPCServer.exposeMethod("stopApplication", self, self.stopApplication);
	secureWebSocketRPCServer.exposeMethod("restartApplication", self, self.restartApplication);
	secureWebSocketRPCServer.exposeMethod("listApplications", self, self.listApplications);
	secureWebSocketRPCServer.exposeMethod("updateSettings", self, self.updateSettings);
	var key = Config.SPACEIFY_TLS_PATH + Config.SERVER_KEY;
	var crt = Config.SPACEIFY_TLS_PATH + Config.SERVER_CRT;
	var ca_crt = Config.SPACEIFY_WWW_PATH + Config.SPACEIFY_CRT;
	secureWebSocketRPCServer.connect.sync({hostname: options.hostname, port: options.ports.https, is_secure: true, key: key, crt: crt, ca_crt: ca_crt, owner: "AppManager"});

	try {
		coreRPCClient.sync.connect({hostname: null, port: Config.CORE_PORT_WEBSOCKET, persistent: true, owner: "AppManager"});
		options.coreIsUp = true;
		}
	catch(err)
		{}
	});

self.close = fibrous( function()
	{
	coreRPCClient.close();
	webSocketRPCServer.sync.close();
	secureWebSocketRPCServer.sync.close();
	});

var lock = function(spm)
	{ // Lock application manager, return false if already locked (= busy). Open JSON-RPC connection to spm, if requested, for messaging.
	if(spm && !spmRPCClient)
		{
		spmRPCClient = new WebSocketRPCClient();
		try { spmRPCClient.sync.connect({hostname: null, port: Config.SPM_PORT_WEBSOCKET, persistent: true, owner: "AppManager"}); } catch(err) { spmRPCClient = null; }
		}

	if(isLocked)
		{
		messages.sync(Language.E_LOCKED.message);
		return false;
		}

	isLocked = true;
	return true;
	}

var unlock = function()
	{
	isLocked = false;

	if(spmRPCClient)
		spmRPCClient.close();
	spmRPCClient = null;
	}

/* ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** **/
/* EXPOSED JSON-RPC  ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** **/
/* ToDo: For all exposed. Check is admin logegd in if connections are allowed from client-side. Check IP if connections are allowed only from local IPs. */
self.installApplication = fibrous( function(package, isSuggested, username, password, spm)
	{
	var suggested_applications = [];

	try {
		if(!lock(spm))
			return;

		removeTemporaryFiles.sync();

		// Get current release information
		database.open(Config.SPACEIFY_DATABASE_FILE);
		var settings = database.sync.getSettings();

		// Try to get the package
		var registry_url = Config.REGISTRY_INSTALL_URL + "?package=" + package + "&release=" + settings["release_name"];
		if(!getPackage.sync(package, isSuggested, true, username, password, registry_url))
			throw Utility.ferror(Language.E_FAILED_TO_PROCESS_PACKAGE.p("AppManager::installApplication"), {":package": package});

		// Validate the package for any errors
		messages.sync(Language.VALIDATING_PACKAGE);

		var validator = new ValidateApplication();
		var manifest = validator.sync.validatePackage(Config.WORK_PATH, Config.WORK_PATH + Config.APPLICATION_DIRECTORY);

		// Application must not have same service names with already installed applications
		var errors = database.sync.checkProvidedServices(manifest);
		if(errors)
			{
			for(var i=0; i<errors.length; i++)
				messages.sync(Utility.replace(Language.SERVICE_ALREADY_REGISTERED, {":name": errors[i]["service_name"], ":app": errors[i]["unique_name"]}));

			throw Utility.error(Language.E_SERVICE_ALREADY_REGISTERED.p("AppManager::installApplication"));
			}

		// Stop existing application if core is up and application is running (and is installed)
		if(options.coreIsUp && coreRPCClient.sync.call("isApplicationRunning", [manifest.type, manifest.unique_name], self))
			{
			messages.sync(Language.STOPPING_APPLICATION);
			coreRPCClient.sync.call("stopApplication", [manifest.type, manifest.unique_name], self);
			}

		// Install the application
		install.sync(manifest);

		// Start the application again if it is not a spacelet
		if(options.coreIsUp && manifest.type != Config.SPACELET)
			{
			messages.sync(Language.STARTING_APPLICATION);
			coreRPCClient.sync.call("startApplication", [manifest.type, manifest.unique_name], self);
			}

		// Check does the package have suggested applications in required_services.
		if(manifest.requires_services)
			{
			for(var s=0; s<manifest.requires_services.length; s++)
				{
				messages.sync(null);

				var required_service = manifest.requires_services[s];
				var existing_service = database.sync.getService(required_service.service_name);

				if(required_service.suggested_application == "" && !existing_service)		// No suggested application defined and no registered service by the name found -> this application might not work as intented
					messages.sync(Utility.replace(Language.REQUIRED_SERVICE_NOT_AVAILABLE, {":name": required_service.service_name}));
				else if(required_service.suggested_application == "" && existing_service)	// No suggested service but registered service name found -> using the existing application/service
					messages.sync(Utility.replace(Language.REQUIRED_SERVICE_ALREADY_REGISTERED, {":name": existing_service.service_name, ":app": existing_service.unique_name, ":version": existing_service.version}));
				else																		// Suggested application defined...
					{
					if(!existing_service)														// ..and service not already registered -> try to install the suggested application
						{
						messages.sync(Utility.replace(Language.REQUIRED_SERVICE_INSTALL_SA, {":name": required_service.service_name, ":app": required_service.suggested_application}));
						suggested_applications.push(required_service.suggested_application);
						}
					else																		// ..but service already registered -> don't reinstall even if version would change
						{
						var pack = required_service.suggested_application.split("@");

						if(existing_service.unique_name != pack[0])									// Suggested and installed applications are different -> using the existing application/service
							messages.sync(Utility.replace(Language.REQUIRED_SERVICE_DIFFERENT_APPS, {":name": required_service.service_name, ":app": existing_service.unique_name, ":version": existing_service.version, ":sapp": required_service.suggested_application}));
						else																		// Suggested application is same as the installed application -> using the existing application@version
							messages.sync(Utility.replace(Language.REQUIRED_SERVICE_SAME_APPS, {":name": required_service.service_name, ":app": existing_service.unique_name, ":version": existing_service.version, ":sapp": required_service.suggested_application}));
						}
					}
				}
			}
		}
	catch(err)
		{
		printErrors(err);
		}
	finally
		{
		database.close();
		removeTemporaryFiles.sync();
		unlock();
		}

	return suggested_applications;
});
	
self.removeApplication = fibrous( function(unique_name, spm)
	{
	var dockerImage = new DockerImage();

	try {
		if(!lock(spm))
			return;

		database.open(Config.SPACEIFY_DATABASE_FILE);
		database.sync.begin();																				// global transaction

		var app_data = database.sync.getApplication([unique_name]);
		if(!app_data)
			throw Utility.ferror(Language.E_APPLICATION_NOT_INSTALLED.p("AppManager::removeApplication"), {":name": unique_name});

		// Stop all the instances of running applications having unique_name if core is running
		messages.sync(Language.REMOVING_APPLICATION);
		if(options.coreIsUp)
			coreRPCClient.sync.call("removeApplication", [app_data.type, unique_name], self);

		// Remove existing docker images + containers
		messages.sync(Language.REMOVING_DOCKER);

		var inspected = dockerImage.sync.inspect(app_data.unique_name);
		if(inspected)																						// remove committed image - made either from spaceifyubuntu or custom image
			dockerImage.sync.removeImage(app_data.docker_image_id, app_data.unique_name);

		inspected = dockerImage.sync.inspect(Config.CUSTOM + app_data.unique_name);							// remove custom image
		if(inspected)
			dockerImage.sync.removeImage(inspected.id, Config.CUSTOM + app_data.unique_name);

		// Remove application files directory
		messages.sync(Language.DELETE_FILES);
		if(app_data.type == Config.SPACELET)
			removeUniqueData.sync(Config.SPACELETS_PATH, app_data);
		else if(app_data.type == Config.SANDBOXED)
			removeUniqueData.sync(Config.SANDBOXED_PATH, app_data);
		//else if(app_data.type == Config.NATIVE)
		//	removeUniqueData.sync(Config.NATIVE_PATH, app_data);

		// Remove database entries
		messages.sync(Language.REMOVE_FROM_DATABASE);
		database.sync.removeApplication(unique_name);

		// Finalize remove
		messages.sync(Utility.replace(Language.APPLICATION_REMOVED, {":app": unique_name}));
		database.sync.commit();
		}
	catch(err)
		{
		database.sync.rollback();
		throw Utility.error(err);
		}
	finally
		{
		database.close();

		unlock();
		}
	});

self.stopApplication = fibrous( function(unique_name, spm)
	{
	try {
		if(!lock(spm))
			return;

		if(!options.coreIsUp)
			throw Utility.ferror(Language.E_CORE_NOT_RUNNING.p("AppManager::stopApplication"), {":command": "stop"});

		database.open(Config.SPACEIFY_DATABASE_FILE);
		var app_data = database.sync.getApplication([unique_name]);
		if(!app_data)
			throw Utility.ferror(Language.E_APPLICATION_NOT_INSTALLED.p("AppManager::stopApplication"), {":name": unique_name});

		if(!coreRPCClient.sync.call("isApplicationRunning", [app_data.type, app_data.unique_name], self))
			messages.sync(Utility.replace(Language.ALREADY_STOPPED, {":app": app_data.unique_name}));
		else
			{
			messages.sync(Language.STOPPING_APPLICATION);
			coreRPCClient.sync.call("stopApplication", [app_data.type, app_data.unique_name], self);
			}
		}
	catch(err)
		{
		throw Utility.error(err);
		}
	finally
		{
		database.close();

		unlock();
		}
	});

self.startApplication = fibrous( function(unique_name, spm)
	{
	try {
		if(!lock(spm))
			return;

		if(!options.coreIsUp)
			throw Utility.ferror(Language.E_CORE_NOT_RUNNING.p("AppManager::startApplication"), {":command": "start"});

		database.open(Config.SPACEIFY_DATABASE_FILE);
		var app_data = database.sync.getApplication([unique_name]);
		if(!app_data)
			throw Utility.ferror(Language.E_APPLICATION_NOT_INSTALLED.p("AppManager::startApplication"), {":name": unique_name});

		if(coreRPCClient.sync.call("isApplicationRunning", [app_data.type, app_data.unique_name], self))
			messages.sync(Utility.replace(Language.ALREADY_RUNNING, {":app": app_data.unique_name}));
		else
			{
			messages.sync(Language.STARTING_APPLICATION);
			coreRPCClient.sync.call("startApplication", [app_data.type, app_data.unique_name], self);
			}
		}
	catch(err)
		{
		throw Utility.error(err);
		}
	finally
		{
		database.close();

		unlock();
		}
	});

self.restartApplication = fibrous( function(unique_name, spm)
	{
	try {
		if(!lock(spm))
			return;

		if(!options.coreIsUp)
			throw Utility.ferror(Language.E_CORE_NOT_RUNNING.p("AppManager::restartApplication"), {":command": "restart"});

		database.open(Config.SPACEIFY_DATABASE_FILE);
		var app_data = database.sync.getApplication([unique_name]);
		if(!app_data)
			throw Utility.ferror(Language.E_APPLICATION_NOT_INSTALLED.p("AppManager::restartApplication"), {":name": unique_name});

		messages.sync(Language.STOPPING_APPLICATION);
		coreRPCClient.sync.call("stopApplication", [app_data.type, app_data.unique_name], self);

		messages.sync(Language.STARTING_APPLICATION);
		coreRPCClient.sync.call("startApplication", [app_data.type, app_data.unique_name], self);

		messages.sync(Language.RESTARTED_APPLICATION);
		}
	catch(err)
		{
		throw Utility.error(err);
		}
	finally
		{
		database.close();

		unlock();
		}
	});

self.listApplications = fibrous( function(type)
	{
	var applications;
	try {
		database.open(Config.SPACEIFY_DATABASE_FILE);
		applications = database.sync.getApplications(type);
		}
	catch(err)
		{
		throw Utility.error(Language.E_FAILED_TO_LIST_APPLICATIONS.p("AppManager::listApplications"), err);
		}
	finally
		{
		database.close();
		}

	return applications;
	});

self.updateSettings = fibrous( function(settings, inject_files)
	{
	try {
		database.open(Config.SPACEIFY_DATABASE_FILE);
		database.sync.updateSettings(settings, inject_files)
		}
	catch(err)
		{
		throw Utility.error(Language.E_FAILED_TO_UPDATE_SETTINGS.p("AppManager::updateSettings"), err);
		}
	finally
		{
		database.close();
		}
	});

self.publishPackage = fibrous( function(package, username, password, github_username, github_password)
	{
	// LOAD APPLICATION PACKAGE
	try {
		removeTemporaryFiles.sync();

		// Get release information
		database.open(Config.SPACEIFY_DATABASE_FILE);
		var settings = database.sync.getSettings();

		// Parse package (name|directory|archive|url|git url) string
		var purl = url.parse(package, true);
		purl.pathname = purl.pathname.replace(/^\/|\/$/g, "");
		var gitoptions = purl.pathname.split("/");

		// --- 1. --- Try local directory <package>
		if(Utility.sync.isLocal(package, "directory"))
			{
			messages.sync(Utility.replace(Language.TRYING_TO_PUBLISH, {":what": Language.LOCAL_DIRECTORY, ":package": package, }));

			mkdirp.sync(Config.WORK_PATH, 0777);
			Utility.sync.zipDirectory(package, Config.WORK_PATH + Config.PUBLISHZIP);
			package = Config.WORK_PATH + Config.PUBLISHZIP;
			}

		// --- 2. --- Try local <package>.zip
		else if(Utility.sync.isLocal(package, "file") && package.search(/\.zip$/i) != -1)
			{
			messages.sync(Utility.replace(Language.TRYING_TO_PUBLISH, {":what": Language.LOCAL_ARCHIVE, ":package": package}));
			}

		// --- 3. --- Try GitHub <package>
		else if(purl.hostname && purl.hostname.match(/(github\.com)/i) != null && gitoptions.length == 2)
			{
			messages.sync(Utility.replace(Language.TRYING_TO_PUBLISH, {":what": Language.GIT_REPOSITORY, ":package": package}));

			git.sync(gitoptions, github_username, github_password);

			mkdirp.sync(Config.WORK_PATH, 0777);
			Utility.sync.zipDirectory(Config.WORK_PATH, Config.WORK_PATH + Config.PUBLISHZIP);
			package = Config.WORK_PATH + Config.PUBLISHZIP;
			}

		// --- FAILURE--- 
		else
			throw Utility.ferror(Language.E_FAILED_TO_RESOLVE_PACKAGE.p("AppManager::publishPackage"), {":package": package});

		// Try to publish the package
		var result = Utility.sync.postPublish(package, username, password, settings["release_name"]);

		result = Utility.parseJSON(result, true);
		if(typeof result != "object")																// Other than 200 OK was received?
			{
			messages.sync(Language.PACKAGE_POST_ERROR);
			messages.sync(result + " " + (http_status[result] ? http_status[result].message : http_status["unknown"].message));
			}
		else if(result.err != null)																	// Errors in the package zip archive and/or manifest?
			{
			messages.sync(Language.PACKAGE_POST_ERROR);
			for(e in result.err)
				messages.sync(" - " + e + ": " + result.err[e]);
			}
		else
			messages.sync(Language.PACKAGE_POST_OK);
		}
	catch(err)
		{
		throw Utility.error(err);
		}
	finally
		{
		database.close();
		removeTemporaryFiles.sync();
		}

	return true;
	});

self.sourceCode = fibrous( function(package, username, password)
	{
	try {
		removeTemporaryFiles.sync();

		// Get current release information
		database.open(Config.SPACEIFY_DATABASE_FILE);
		var settings = database.sync.getSettings();

		// Get sources
		var registry_url = Config.REGISTRY_INSTALL_URL + "?package=" + package + "&release=" + settings["release_name"];
		if(!getPackage.sync(package, false, false, username, password, registry_url))
			throw Utility.ferror(Language.E_FAILED_TO_PROCESS_PACKAGE.p("AppManager::sourceCode"), {":package": package});

		var dest = package.replace(/[^0-9a-zA-Z-_]/g, "_");
		dest = dest.replace(/_{2,}/g, "_");
		dest = dest.replace(/^_*|_*$/g, "");
		dest = process.cwd() + "/" + Config.SOURCES_DIRECTORY + dest;

		Utility.sync.deleteDirectory(dest);															// Remove previous files
		Utility.sync.copyDirectory(Config.WORK_PATH, dest);											// Copy files to sources directory

		messages.sync(Utility.replace(Language.GET_SOURCES_OK, {":directory": dest}));
		}
	catch(err)
		{
		printErrors(err);
		}
	finally
		{
		database.close();
		removeTemporaryFiles.sync();
		}
	});

/* ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** **/
/* PRIVATE  ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** **/
var getPackage = fibrous( function(package, isSuggested, tryLocal, username, password, registry_url)
	{ // Get package by (unique name|directory|archive|url|git url)
	var is_package = false;

	var purl = url.parse(package, true);
	purl.pathname = purl.pathname.replace(/^\/|\/$/g, "");
	var gitoptions = purl.pathname.split("/");

	var cwd_package = process.cwd() + "/" + package;

	// --- 1.0 --- Try local directory <package>
	if(!isSuggested && tryLocal && Utility.sync.isLocal(package, "directory"))
		is_package = getLocalDirectory.sync(package);

	// --- 1.1 --- Try local directory <cwd/package>
	else if(!isSuggested && tryLocal && Utility.sync.isLocal(cwd_package, "directory"))
		is_package = getLocalDirectory.sync(cwd_package);

	// --- 2.0 --- Try local <package>.zip
	else if(!isSuggested && tryLocal && Utility.sync.isLocal(package, "file") && package.search(/\.zip$/i) != -1)
		is_package = getLocalZip.sync(package);

	// --- 2.1 --- Try local <cwd/package>.zip
	else if(!isSuggested && tryLocal && Utility.sync.isLocal(cwd_package, "file") && package.search(/\.zip$/i) != -1)
		is_package = getLocalZip.sync(cwd_package);

	// --- 3.0 --- Try remote <package>.zip (remote url)
	else if(!isSuggested && Utility.sync.loadRemoteFileToLocalFile(package, Config.WORK_PATH, Config.PACKAGEZIP))
		{
		messages.sync(Utility.replace(Language.TRYING_TO_GET, {":from": Language.REMOTE_ARCHIVE, ":package": package}));

		is_package = Utility.unZip(Config.WORK_PATH + Config.PACKAGEZIP, Config.WORK_PATH, true);
		}

	// --- 4.0 --- Try "pulling" a git repository <package>
	else if(!isSuggested && purl.hostname && purl.hostname.match(/(github\.com)/i) != null && gitoptions.length == 2)
		{
		messages.sync(Utility.replace(Language.TRYING_TO_GET, {":from": Language.GIT_REPOSITORY, ":package": package}));

		is_package = git.sync(gitoptions, username, password);
		}

	// --- 5.0 --- Try <unique_name>[@<version>] from registry - suggested applications can be tried from the registry!!!
	else if(Utility.sync.loadRemoteFileToLocalFile(registry_url + "&username=" + username + "&password=" + password, Config.WORK_PATH, Config.PACKAGEZIP))
		{
		messages.sync(Utility.replace(Language.TRYING_TO_GET, {":from": Language.SPACEIFY_REGISTRY, ":package": package}));

		// CHECK FOR ERRORS BEFORE TRYING TO FIND THE MANIFEST FROM THE PACKAGE
		is_package = Utility.unZip(Config.WORK_PATH + Config.PACKAGEZIP, Config.WORK_PATH, true);

		if(Utility.sync.isLocal(Config.WORK_PATH + Config.SPMERRORSJSON, "file"))
			{
			messages.sync(Language.PACKAGE_INSTALL_ERROR);

			var errfile = fs.sync.readFile(Config.WORK_PATH + Config.SPMERRORSJSON, {encoding: "utf8"});
			var result = Utility.parseJSON(errfile, true);

			var errors = [];
			for(e in result.err)
				errors.push(Utility.makeError(e, result.err[e], ""));

			throw errors;
			}
		}

	// --- FAILURE ---
	else
		throw Utility.ferror(Language.E_FAILED_TO_RESOLVE_PACKAGE.p("AppManager::getPackage"), {":package": package});

	return is_package;
	});

var getLocalDirectory = fibrous( function(package)
	{
	messages.sync(Utility.replace(Language.TRYING_TO_GET, {":from": Language.LOCAL_DIRECTORY, ":package": package}));

	package += (package.search(/\/$/) == -1 ? "/" : "");
	Utility.sync.copyDirectory(package, Config.WORK_PATH, true);

	return true;
	});

var getLocalZip = fibrous( function(package)
	{
	messages.sync(Utility.replace(Language.TRYING_TO_GET, {":from": Language.LOCAL_ARCHIVE, ":package": package}));

	return Utility.unZip(package, Config.WORK_PATH, true);
	});

var install = fibrous( function(manifest)
	{
	var app;
	var app_path;
	var app_data;
	var customDockerImage = (typeof manifest.docker_image != "undefined" && manifest.docker_image == true ? true : false);
	var dockerImage = new DockerImage();

	try {
		if(manifest.type == Config.SPACELET)
			{
			app = new Application.obj(manifest);
			app_path = Config.SPACELETS_PATH;
			}
		else if(manifest.type == Config.SANDBOXED)
			{
			app = new Application.obj(manifest);
			app_path = Config.SANDBOXED_PATH;
			}
		//else if(manifest.type == Config.NATIVE) {}

		database.sync.begin();																				// global transaction (database is already opened in installApplication!)
		app_data = database.sync.getApplication([manifest.unique_name]);

		// REMOVE EXISTING DOCKER IMAGE(S) AND APPLICATION FILES
		var inspected = null;
		var docker_image_name = (customDockerImage ? Config.CUSTOM + manifest.unique_name : Config.SPACEIFY_DOCKER_IMAGE);

		if(app_data)
			{
			messages.sync(Language.REMOVING_DOCKER);

			inspected = dockerImage.sync.inspect(app_data.unique_name);
			if(inspected)																					// remove committed image - made either from spaceifyubuntu or custom image
				dockerImage.sync.removeImage(app_data.docker_image_id, app_data.unique_name);

			if(customDockerImage)																			// remove custom image
				{
				inspected = dockerImage.sync.inspect(docker_image_name);
				if(inspected)
					dockerImage.sync.removeImage(inspected.id, docker_image_name);
				}

			messages.sync(Language.DELETE_FILES);															// delete existing application directory/files.
			removeUniqueData.sync(app_path, app_data);
			}

		// INSTALL APPLICATION AND API FILES TO VOLUME DIRECTORY
		messages.sync(Language.INSTALL_APPLICATION_FILES);
		var volume_path = app_path + manifest.unique_directory + Config.VOLUME_DIRECTORY;
		Utility.sync.copyDirectory(Config.WORK_PATH, volume_path);											// Copy applications files to volume

		// GENERATE A SPACEIFY CA SIGNED CERTIFICATE FOR THIS APPLICATION
		messages.sync(Language.INSTALL_GENERATE_CERTIFICATE);
		createClientCertificate.sync(app_path, manifest);

		// CREATE A NEW DOCKER IMAGE FOR THE APPLICATION FROM THE DEFAULT IMAGE OR CUSTOM IMAGE
		if(customDockerImage)
			{ // test: docker run -i -t image_name /bin/bash
			messages.sync(Utility.replace(Language.INSTALL_CREATE_DOCKER_IMAGE, {":image": docker_image_name}));
			Utility.execute.sync("docker", ["build", "--no-cache", "--rm", "-t", docker_image_name, "."], {cwd: app_path + manifest.unique_name + Config.APPLICATION_PATH}, null);
			}
		else
			messages.sync(Utility.replace(Language.INSTALL_CREATE_DOCKER, {":image": Config.SPACEIFY_DOCKER_IMAGE}));

		var dockerContainer = new DockerContainer();
		dockerContainer.sync.startContainer(app.getProvidesServicesCount(), docker_image_name);
		var image = dockerContainer.sync.installApplication(app);
		manifest.docker_image_id = image.Id;
		dockerImage.sync.removeContainers("", docker_image_name, dockerContainer.getStreams());

		// INSERT/UPDATE APPLICATION DATA TO DATABASE - FINALIZE INSTALLATION
		messages.sync(Language.INSTALL_UPDATE_DATABASE);
		if(app_data)
			database.sync.updateApplication(manifest);
		else
			database.sync.insertApplication(manifest);

		database.sync.commit();

		// COPY PACKAGE TO INSTALLED PACKAGES DIRECTORY
		Utility.sync.zipDirectory(Config.WORK_PATH, Config.INSTALLED_PATH + manifest.docker_image_id + Config.EXT_COMPRESSED);

		// APPLICATION IS NOW INSTALLED SUCCESSFULLY
		var tstr = (manifest.type == Config.SPACELET ? "" : Language.APPLICATIONLC);
		messages.sync(Utility.replace(Language.INSTALL_APPLICATION_OK, {":type": Utility.ucfirst(manifest.type) + " " + tstr, ":app": manifest.unique_name, ":version": manifest.version}));
		}
	catch(err)
		{
		database.sync.rollback();

		dockerImage.sync.removeImage((manifest.docker_image_id ? manifest.docker_image_id : ""), manifest.unique_name);

		removeUniqueData.sync(app_path, manifest);

		throw Utility.error(Language.E_FAILED_TO_INSTALL_APPLICATION.p("AppManager::install"), err);
		}
	});

var removeTemporaryFiles = fibrous( function()
	{
	Utility.sync.deleteFile(Config.WORK_PATH + Config.PUBLISHZIP, false);
	Utility.sync.deleteFile(Config.WORK_PATH + Config.PACKAGEZIP, false);
	Utility.sync.deleteDirectory(Config.WORK_PATH, false);
	});

var removeUniqueData = fibrous( function(path, obj)
	{ // Removes existing application data and leaves users data untouched
	Utility.sync.deleteDirectory(path + obj.unique_directory + Config.VOLUME_DIRECTORY + Config.APPLICATION_DIRECTORY);
	Utility.sync.deleteDirectory(path + obj.unique_directory + Config.VOLUME_DIRECTORY + Config.TLS_DIRECTORY);

	if(Utility.sync.isLocal(Config.INSTALLED_PATH + obj.docker_image_id + Config.EXT_COMPRESSED, "file"))
		fs.sync.unlink(Config.INSTALLED_PATH + obj.docker_image_id + Config.EXT_COMPRESSED);
	});

var createClientCertificate = fibrous( function(app_path, manifest)
	{
	var tls_path = app_path + manifest.unique_directory + Config.VOLUME_DIRECTORY + Config.TLS_DIRECTORY;

	try {
		// Create an unique configuration for every certificate by using/modifying the openssl configurations.
		Utility.execute.sync("./makeserver.sh", [tls_path, manifest.unique_name], {cwd: Config.TLS_SQUID_PATH}, null);
		}
	catch(err)
		{
		throw Utility.error(Language.E_FAILED_CERTIFICATE_CREATE.p("AppManager::createClientCertificate"), err);
		}
	});

var git = fibrous( function(gitoptions, username, password)
	{
	gitoptions[1] = gitoptions[1].replace(/(.git)$/i, "");

	try {
		var github = new Github({version: "3.0.0"});

		if(username != "" && password != "")																					// Use authentication when its provided
			github.authenticate({type: "basic", username: username, password: password});

		var content = github.repos.sync.getContent({user: gitoptions[0], repo: gitoptions[1], path: ""});

		var ref = github.gitdata.sync.getReference({user: gitoptions[gitoptions.length - 2], repo: gitoptions[1], ref: "heads/master"});

		var tree = github.gitdata.sync.getTree({user: gitoptions[0], repo: gitoptions[1], sha: ref.object.sha, recursive: 1});	// get the whole repository content
		tree = tree.tree;

		var blobs = 0, blobPos = 1;
		for(i=0; i<tree.length; i++)																						// get the blob count
			{
			if(tree[i].type == "blob")
				blobs++;
			}

		var tmp_path = Config.WORK_PATH;
		mkdirp.sync(tmp_path, 0755);
		for(var i=0; i<tree.length; i++)																					// create required directories and get blobs of data
			{
			if(tree[i].type == "tree")
				mkdirp.sync(tmp_path + tree[i].path, 0755);
			else if(tree[i].type == "blob")
				{
				messages.sync(Utility.replace(Language.DOWNLOADING_GITUHB, {":pos": blobPos++, ":count": blobs, ":what": tree[i].path, ":bytes": tree[i].size, ":where": tree[i].url}));

				var blob = github.gitdata.sync.getBlob({user: gitoptions[0], repo: gitoptions[1], sha: tree[i].sha});
				fs.sync.writeFile(tmp_path + tree[i].path, blob.content, {"encoding": blob.encoding.replace("-", "")});		// base64 or utf-8 (utf8 in nodejs)
				}
			}
		}
	catch(err)
		{
		throw Utility.error(Language.E_FAILED_GITHUB_DATA.p("AppManager::git"), err);
		}

	return true;
	});

var messages = fibrous( function(message, literal)
	{
	literal = (literal ? true : false);
	if(spmRPCClient)
		spmRPCClient.sync.call("messages", [message, literal], null);
	logger.force(message, literal);
	});

var printErrors = function(err)
	{
	if(err instanceof Array)																// These errors may originate from getPackage or validate
		{
		for(var i=0; i<err.length; i++)
			messages.sync("- " + err[i].getCode() + ": " + err[i].getMessage());
		}
	else if(err)																			// "Normal" errors
		throw Utility.error(err);
	}

}

module.exports = AppManager;
