#!/usr/bin/env node
/**
 * Spaceify language file, 2013 Spaceify Inc.
 *
 *  Language: EN_US
 */

var SpaceifyError = require("./spaceifyerror");

var language =
	{
	/* ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** **
	** ERRORS * ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** **
	** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** */
	// General
	"E_GENERAL_ERROR": new SpaceifyError({"code": "", "message": ":err"}),

	// Utility
	"E_FAILED_TO_INITIATE_HTTP_GET": new SpaceifyError({"code": 1000, "message": "Failed to initiate HTTP(S) GET."}),
	"E_FAILED_TO_LOAD_REMOTE_FILE": new SpaceifyError({"code": 1001, "message": "Failed to load remote file: :file, status code: :code."}),
	"E_FAILED_TO_INITIATE_HTTP_POST": new SpaceifyError({"code": 1002, "message": "Failed to initiate HTTP(S) POST."}),
	"E_FAILED_TO_POST_FORM": new SpaceifyError({"code": 1003, "message": "Failed to POST a form: :url, status code: :code."}),
	"E_LOAD_REMOTE_FILE_TO_LOCAL_FILE": new SpaceifyError({"code": 1018, "message": "Failed to load remote file."}),
	"E_DELETE_DIRECTORY": new SpaceifyError({"code": 1019, "message": "Failed to delete directory."}),
	"E_COPY_DIRECTORY": new SpaceifyError({"code": 1020, "message": "Failed copy directory."}),
	"E_MOVE_DIRECTORY": new SpaceifyError({"code": 1021, "message": "Failed to move dfirectory."}),
	"E_DELETE_FILE": new SpaceifyError({"code": 1022, "message": "Failed to delete file."}),
	"E_COPY_FILE": new SpaceifyError({"code": 1023, "message": "Failed to copy file."}),
	"E_MOVE_FILE": new SpaceifyError({"code": 1024, "message": "Failed to move file."}),
	"E_ZIP_DIRECTORY": new SpaceifyError({"code": 1025, "message": "Failed to compress files."}),
	"E_LOAD_JSON": new SpaceifyError({"code": 1026, "message": "Failed to load JSON file."}),
	"E_SAVE_JSON": new SpaceifyError({"code": 1027, "message": "Failed to save JSON file."}),

	// SpaceifyCore
	"E_GET_SERVICE_UNKNOWN": new SpaceifyError({"code": 2000, "message": "Get service failed because service :name was not found."}),
	"E_GET_SERVICE_UNKNOWN_ADDRESS": new SpaceifyError({"code": 2001, "message": "Get service failed because callers remote address is unknown."}),
	"E_GET_SERVICE_UNREGISTERED": new SpaceifyError({"code": 2002, "message": "Get service failed because service :name is not registered."}),

	"E_GET_MANIFEST_NOT_FOUND": new SpaceifyError({"code": 2003, "message": "Get manifest failed because application :name was not found."}),

	"E_REGISTER_SERVICE_UNKNOWN_ADDRESS": new SpaceifyError({"code": 2004, "message": "Register service failed because callers remote address :address is unknown."}),
	"E_REGISTER_SERVICE_UNKNOWN_SERVICE_NAME": new SpaceifyError({"code": 2005, "message": "Failed to register service because service name :name is unknown (not introduced in manifest)."}),
	"E_UNREGISTER_SERVICE_UNKNOWN_ADDRESS": new SpaceifyError({"code": 2006, "message": "Unregistering service failed because callers remote address :address is unknown."}),
	"E_UNREGISTER_SERVICE_UNKNOWN_SERVICE_NAME": new SpaceifyError({"code": 2007, "message": "Failed to unregister service because service name :name is unknown (not introduced in manifest)."}),

	"E_ADMIN_LOGIN_ERROR": new SpaceifyError({"code": 2008, "message": "Admin log in failed."}),
	"E_ADMIN_LOGOUT_ERROR": new SpaceifyError({"code": 2008, "message": "Admin log in failed."}),
	"E_ADMIN_LOGIN_ADDRESS": new SpaceifyError({"code": 2009, "message": "Callers remote address is unknown."}),
	"E_ADMIN_LOGIN_USER": new SpaceifyError({"code": 2010, "message": "Failed to get user data."}),
	"E_ADMIN_LOGIN_PASSWORD": new SpaceifyError({"code": 2011, "message": "The password is incorrect."}),
	"E_ADMIN_SESSION_UNKNOWN": new SpaceifyError({"code": 2012, "message": "Unknown session identifier."}),
	"E_ADMIN_SESSION_INVALID": new SpaceifyError({"code": 2013, "message": "Invalid session identifier."}),

 	"E_EDGE_LOGIN": new SpaceifyError({"code": 2014, "message": "Edge login to spaceify.net failed."}),

	"E_OPTIONS_SESSION_INVALID": new SpaceifyError({"code": 2015, "message": "Invalid session identifier."}),
	"E_OPTIONS_UNKNOWN_APPLICATION": new SpaceifyError({"code": 2016, "message": "Application with the unique_identifier :name was not found."}),

	"E_UNKNOWN_MAC": new SpaceifyError({"code": 2017, "message": "Callers MAC address is unknown."}),

	"E_SPLASH_ADD_FAILED": new SpaceifyError({"code": 2018, "message": "Failed to add the MAC address to the accepted addresses list."}),

	"E_GET_APP_DATA_FAILED": new SpaceifyError({"code": 2019, "message": "Failed to get application data."}),

	"E_FAILED_TO_START_SPACELET": new SpaceifyError({"code": 2020, "message": "Failed to start spacelet."}),

	// Common
	"E_JSON_PARSE_FAILED": new SpaceifyError({"code": 3003, "message": "Failed to parse json."}),

	// DockerContainer
	"E_CREATE_CONTAINER_FAILED": new SpaceifyError({"code": 4000, "message": "Creating the container failed."}),
	"E_INIT_CONTAINER_FAILED": new SpaceifyError({"code": 4001, "message": "Initializing the container failed."}),
	"E_START_CONTAINER_FAILED": new SpaceifyError({"code": 4002, "message": "Starting the container failed."}),
	"E_CONTAINER_INSPECT_FAILED": new SpaceifyError({"code": 4003, "message": "Inspecting the container failed."}),
	"E_STOPPING_CONTAINER_FAILED": new SpaceifyError({"code": 4004, "message": "Stopping a docker container failed: :err."}),
	"E_EXECUTING_COMMAND_FAILED": new SpaceifyError({"code": 4005, "message": "Executing command in a docker container failed."}),
	"E_COPYING_FILE_FAILED": new SpaceifyError({"code": 4006, "message": "Copying file to a docker container failed."}),

	// DockerHelper
	"E_ATTACH_CONTAINER_FAILED": new SpaceifyError({"code": 6000, "message": "Attaching container failed."}),
	"E_ATTACH_CONTAINER_OUTPUT": new SpaceifyError({"code": 6001, "message": "(output stream) :err"}),
	"E_ATTACH_CONTAINER_INPUT": new SpaceifyError({"code": 6002, "message": "(input stream) :err"}),
	"E_SEND_FILE_CONNECT_FAILED": new SpaceifyError({"code": 6003, "message": "Failed to open connection."}),
	"E_SEND_FILE_COPY_FAILED": new SpaceifyError({"code": 6004, "message": "Failed to copy file."}),

	// AppManager
	"E_FAILED_TO_INSTALL_APPLICATION": new SpaceifyError({"code": 7000, "message": "Failed to install application."}),
	"E_FAILED_TO_RESOLVE_PACKAGE": new SpaceifyError({"code": 7001, "message": ":package doesn't resolve to any known package."}),
	"E_FAILED_TO_UPDATE_SETTINGS": new SpaceifyError({"code": 7002, "message": "Failed to update settings."}),
	"E_FAILED_TO_FIND_GIT_APPLICATION": new SpaceifyError({"code": 7003, "message": "The application directory was not found from the git repository :repo."}),
	"E_FAILED_TO_REMOVE_APPLICATION": new SpaceifyError({"code": 7004, "message": "Failed to remove application."}),
	"E_APPLICATION_NOT_INSTALLED": new SpaceifyError({"code": 7005, "message": "Application :name is not installed."}),
	"E_CORE_NOT_RUNNING": new SpaceifyError({"code": 7006, "message": "Can not :command application because core is not running."}),
	"E_LOCKED": new SpaceifyError({"code": 7007, "message": "Another process has locked the application manager."}),
	"E_SERVICE_ALREADY_REGISTERED": new SpaceifyError({"code": 7008, "message": "Applications with same service names can not be installed at the same time."}),
	"E_FAILED_TO_LIST_APPLICATIONS": new SpaceifyError({"code": 7009, "message": "Failed to list applications."}),
	"E_FAILED_CERTIFICATE_CREATE": new SpaceifyError({"code": 7010, "message": "Failed to create certificate for the application."}),
	"E_FAILED_GITHUB_DATA": new SpaceifyError({"code": 7011, "message": "Failed to get data from GitHub."}),
	"E_FAILED_TO_PROCESS_PACKAGE": new SpaceifyError({"code": 7012, "message": "Getting package from :package failed."}),

	// SandboxedManager
	"E_SANDBOXED_FAILED_TO_READ_MANIFEST": new SpaceifyError({"code": 8000, "message": "Unable to read/parse manifest file from sandboxed applications directory."}),
	"E_SANDBOXED_FAILED_INIT_ITSELF": new SpaceifyError({"code": 8001, "message": "Sandboxed application failed to initialize itself."}),
	"E_SANDBOXED_START_FAILED_UNKNOWN_UNIQUE_NAME": new SpaceifyError({"code": 8002, "message": "Failed to start sandboxed application because unique name :name is unknown."}),
	"E_SANDBOXED_FAILED_TO_RUN": new SpaceifyError({"code": 8003, "message": "Failed to run sandboxed application."}),

	// SpaceletManager
	"E_SPACELET_FAILED_INIT_ITSELF": new SpaceifyError({"code": 9000, "message": "Spacelet failed to initialize itself."}),
	"E_FAILED_TO_READ_SPACELET_MANIFEST": new SpaceifyError({"code": 9001, "message": "Unable to read/parse manifest file from spacelets directory."}),
	"E_FAILED_TO_READ_SPACELET_INFO": new SpaceifyError({"code": 9002, "message": "Failed to load spacelets information from the database."}),
	"E_SPACELET_FAILED_RUN": new SpaceifyError({"code": 9003, "message": "Failed to run spacelet."}),

	// WebServer
	"E_INTERNAL_SERVER_ERROR": new SpaceifyError({"code": 500, "message": "<!DOCTYPE html><html><head><title>Server Error</title></head><body><h1>500 Internal Server Error</h1><h3>:server_name at :hostname Port :port</h3></body></html>"}),
	"E_MOVED_PERMANENTLY": new SpaceifyError({"code": 301, "message": '<!DOCTYPE html><html><head><title>Redirection</title></head><body><h1>301 Moved Permanently</h1>The requested document is located in <a href=":location">here</a>.<h3>:server_name at :hostname Port :port</h3></body></html>'}),

	"E_MOVED_FOUND": new SpaceifyError({"code": 302, "message": '<!DOCTYPE html><html><head><title>Redirection</title></head><body><h1>302 Found</h1>The requested document is located in <a href=":location">here</a>.<h3>:server_name at :hostname Port :port</h3></body></html>'}),
	"E_WEBSERVER_FAILED_START": new SpaceifyError({"code": 10000, "message": "WebServer :hostname::port failed to start :err"}),

	// ConnectionHub
	"E_CONNECTIONHUB_CONNECTO": new SpaceifyError({"code": 11000, "message": "Connection to :ip::port failed. :err"}),

	// SPM
	"E_WRONG_NUMBER_OF_ARGUMENTS": new SpaceifyError({"code": 12000, "message": "Wrong number of arguments. Expected: :commands [:options] <package>"}),
	"E_UNKNOW_COMMAND": new SpaceifyError({"code": 12001, "message": "Unknow command :command. Expected: :commands"}),
	"E_UNKNOW_OPTION": new SpaceifyError({"code": 12002, "message": "Unknow option :option. Expected: :options"}),

	// CONNECTIONS
	"RPC_EXECUTE_EXCEPTION": new SpaceifyError({"code": 13000, "message": "Exception in executing a RPC method."}),

	// DataBase
	"E_DATABASE_OPEN": new SpaceifyError({"code": 12000, "message": "Failed to open database connection."}),
	"E_DATABASE_BEGIN": new SpaceifyError({"code": 12001, "message": "Failed to begin transaction."}),
	"E_DATABASE_COMMIT": new SpaceifyError({"code": 12002, "message": "Failed to commit transaction."}),
	"E_DATABASE_ROLLBACK": new SpaceifyError({"code": 12003, "message": "Failed to rollback transaction."}),
	"E_DATABASE_GETAPPLICATION": new SpaceifyError({"code": 12004, "message": "Failed to get application."}),
	"E_DATABASE_GETAPPLICATIONS": new SpaceifyError({"code": 12005, "message": "Failed to get applications."}),
	"E_DATABASE_INSERTAPPLICATION": new SpaceifyError({"code": 12006, "message": "Failed to insert application."}),
	"E_DATABASE_UPDATEAPPLICATION": new SpaceifyError({"code": 12007, "message": "Failed to update application."}),
	"E_DATABASE_REMOVEAPPLICATION": new SpaceifyError({"code": 12008, "message": "Failed to remove application."}),
	"E_DATABASE_UPDATESETTINGS": new SpaceifyError({"code": 12009, "message": "Failed ot update settings."}),
	"E_DATABASE_GETSETTINGS": new SpaceifyError({"code": 12010, "message": "Failed to ge settings."}),
	"E_DATABASE_GETSETTING": new SpaceifyError({"code": 12011, "message": "Failed to get setting."}),
	"E_DATABASE_GETUSERDATA": new SpaceifyError({"code": 12012, "message": "Failed to get user data."}),
	"E_DATABASE_ADMINLOGGEDIN": new SpaceifyError({"code": 12013, "message": "Failed to set admin log in."}),

	// ValidatePackage
	"E_NO_APPLICATION_DIRECTORY": new SpaceifyError({"code": 13000, "message": "Package does not have application directory."}),
	"E_NO_MANIFEST_FILE": new SpaceifyError({"code": 13001, "message": "Package does not have manifest file."}),

	"E_INJECT_FILE": new SpaceifyError({"code": 13002, "message": "Inject file :file is defined in the manifest but is not found in the applications www directory :directory."}),
	"E_IMAGE_FILE": new SpaceifyError({"code": 13003, "message": "Image file :file is defined in the manifest but is not found in the applications image directory :directory."}),
	"E_IMAGE_TYPES": new SpaceifyError({"code": 13004, "message": "Supported image formats are jpg, gif and png."}),
	"E_DOCKER_IMAGE": new SpaceifyError({"code": 13005, "message": "Custom Docker image creation is defined but file Dockerfile is not found from applications directory."}),

	"E_MANIFEST_TYPE": new SpaceifyError({"code": 13006, "message": "Manifest must have type field defined and type must be spacelet, sandboxed or native."}),

	/* ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** **
	** TEXTS ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** **
	** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** */
	// COMMON
	"APPLICATIONLC": "application",

	// CONNECTIONS
	"NO_CONNECTION_TO_SERVER": "No connection to server.",

	// WebServer
	"WEBSERVER_CONNECTING": ":owner::WebServer::connect() :protocol://:hostname::port",
	"WEBSERVER_CLOSING": ":owner::WebServer::close() :protocol://:hostname::port",

	// WebSocketClient, WebSocketRPCClient, WebSocketRPCServer
	"WEBSOCKET_CONNECTING": ":owner:::class::connect() to :protocol://:hostname::port/:subprotocol",
	"WEBSOCKET_CLOSING": ":owner:::class::close() server :protocol://:hostname::port/:subprotocol",
	"WEBSOCKET_CLOSING_WEB": ":owner:::class::close() web server :protocol://:hostname::port",
	"WEBSOCKET_CLOSE_CONNECTION": ":owner:::class::closeConnection() :origin :protocol://:hostname::port/:subprotocol, id=:id",
	"WEBSOCKET_CONNECTION_REQUEST": ":owner:::class::connectionRequest() from :origin :protocol://:address::port, id=:id",
	"WEBSOCKET_SEND_MESSAGE": ":owner:::class::sendMessage() :protocol://:hostname::port/:subprotocol, id=:id, message=:message",
	"WEBSOCKET_ON_MESSAGE": ":owner:::class::onMessage() :protocol://:hostname::port/:subprotocol, id=:id, message=:message",

	// EngineIoRPCServer
	"ENGINE_IO_CONNECTING": ":owner:::class::connect() to :protocol://:hostname::port",
	"ENGINE_IO_CLOSING": ":owner:::class::close() server :protocol://:hostname::port",
	"ENGINE_IO_CLOSING_WEB": ":owner:::class::close() web server :protocol://:hostname::port",
	"ENGINE_IO_CLOSE_CONNECTION": ":owner:::class::closeConnection() :origin :protocol://:address::port, id=:id",
	"ENGINE_IO_CONNECTION_REQUEST": ":owner:::class::connectionRequest() from :origin :protocol://:address::port, id=:id",
	"ENGINE_IO_SEND_MESSAGE": ":owner:::class::sendMessage() :protocol://:hostname::port, id=:id, message=:message",
	"ENGINE_IO_SEND_STRING_MESSAGE": ":owner:::class::sendStringMessage() :protocol://:hostname::port, id=:id, message=:message",
	"ENGINE_IO_ON_MESSAGE": ":owner:::class::onMessage() :protocol://:hostname::port, id=:id, message=:message",

	// DockerHelper
	"EXECUTE_COMMAND": "Trying to execute command: :command\n",
	"EXECUTE_COMMAND_RECEIVED": "Received the end code ':code' from stdout.",

	// DockerImage
	"STOP_CONTAINER": "Stopping temporary container: :container.",
	"REMOVE_CONTAINER": "Removing temporary container: :container.",

	// SpaceifyCore
	"LOGGED_IN_SPACEIFY_NET": "Logged in to spaceify.net - edge_id: :edge_id.",
	"LOGGING_IN_SPACEIFY_NET_FAILED": "Logging in to spaceify.net failed: :result.",
	"LOGGED_OUT_SPACEIFY_NET": "Logged out of spaceify.net.",

	// AppManager
	"TRYING_TO_GET": "Trying to get package from :from",
	"TRYING_TO_PUBLISH": "Trying to publish :what",
	"LOCAL_DIRECTORY": "local directory :package.",
	"LOCAL_ARCHIVE": "local Zip archive :package.",
	"GIT_REPOSITORY": "the GitHub repository :package.",
	"REMOTE_ARCHIVE": "remote Zip archive :package.",
	"SPACEIFY_REGISTRY": "the Spaceify registry :package.",
	"DOWNLOADING_GITUHB": "(:pos/:count) Downloading :what (:bytes bytes) from :where",
	"POSTING_PACKAGE": "Please wait, posting the package to the Spaceify registry.",
	"PACKAGE_POST_ERROR": "Failed to publish the package.",
	"PACKAGE_POST_OK": "Success. The package is now published.",
	"APPLICATION_REMOVED": "Application :app is now removed.",
	"VALIDATING_PACKAGE": "Validating package.",
	"STOPPING_APPLICATION": "Stopping application.",
	"REMOVING_APPLICATION": "Removing existing application.",
	"STARTING_APPLICATION": "Starting application.",
	"RESTARTING_APPLICATION": "Restarting application.",
	"RESTARTED_APPLICATION": "The application is now restarted.",
	"INSTALL_GENERATE_CERTIFICATE": "Generating a Spaceify CA signed certificate for the application.",
	"INSTALL_CERTIFICATE_EXISTS": "Using existing certificate.",
	"REMOVING_DOCKER": "Removing existing Docker image and container.",
	"DELETE_FILES": "Deleting existing application files.",
	"INSTALL_CREATE_DOCKER": "Creating a Docker image for the application from the default image :image.",
	"INSTALL_CREATE_DOCKER_IMAGE": "Creating a custom Docker image :image for the application.",
	"INSTALL_UPDATE_DATABASE": "Writing database entries for the application.",
	"INSTALL_APPLICATION_FILES": "Copying application files to volume.",
	"INSTALL_APPLICATION_OK": ":type :app@:version is now installed.",
	"REMOVE_FROM_DATABASE": "Removing applications entries from the database.",
	"ALREADY_STOPPED": "Application :app is already stopped.",
	"ALREADY_RUNNING": "Application :app is already running.",
	"SERVICE_ALREADY_REGISTERED": "Service name :name is already registered by application :app",
	"PACKAGE_INSTALL_ERROR": "Failed to get the requested package.",
	"GET_SOURCES_OK": "Source codes are now loaded and are in the directory :directory.",

	"REQUIRED_SERVICE_NOT_AVAILABLE": "Required service :name is not registered to the edge. Because suggested application is not defined edge can not try to install an application which implements the service. See http://:name for applications that implement the service and install suitable application manually.",
	"REQUIRED_SERVICE_ALREADY_REGISTERED": "Required service :name is registered by application :app@:version.",
	"REQUIRED_SERVICE_INSTALL_SA": "Required service :name is not registered to the edge. Spm tries to install the suggested application :app.",
	"REQUIRED_SERVICE_DIFFERENT_APPS": "Required service :name is provided by application :app@:version. The suggested application :sapp is not installed. If you prefer to use the suggested application remove the existing application and then install the suggested application manually.",
	"REQUIRED_SERVICE_SAME_APPS": "Required service :name is provided by the same application :app@:version as the suggested application. The suggested application :sapp is not installed.",

	// SPM
	"AUTHENTICATION": "Authentication requested for :auth_host.",
	"USERNAME": "Username: ",
	"PASSWORD": "Password: ",

	"NO_APPLICATIONS": "No applications to list.",
	"INSTALLED_SPACELETS": "Installed spacelets.",
	"INSTALLED_SANDBOXED": "Installed sandboxed applications.",
	"INSTALLED_NATIVE": "Installed native applications.",

	"M_NAME": "Name: ",
	"M_CATEGORY": "Category: ",
	"M_SHARED": "Shared: ",
	"M_YES": "Yes",
	"M_NO": "No",
	"M_INJECT": "Inject",
	"M_INJECT_ENABLED": "Enabled: ",
	"M_INJECT_IDENTIFIER": "Identifier: ",
	"M_INJECT_HOSTNAMES": "Hostnames",
	"M_INJECT_FILES": "Files",
	"M_DEVELOPER": "Developer: ",
	"M_CONTRIBUTORS": "Contributors",
	"M_CREATION_DATE": "Creation date: ",
	"M_PUBLISH_DATE": "Publish date: ",
	"M_INSTALLATION_DATE": "Installation date: ",
	"M_PROVIDES_SERVICES": "Provides services",
	"M_REQUIRES_SERVICES": "Requires services"
	};

module.exports = language;
