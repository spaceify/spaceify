#!/usr/bin/env node
/**
 * Spaceify language file, 2013 Spaceify Inc.
 *
 *  Locale: EN_US
 */

var SpaceifyError = require("./spaceifyerror");

var language =
	{
	/* ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** **
	** ERRORS * ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** **
	** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** */
	// General
	"E_GENERAL_ERROR": new SpaceifyError({"code": "", "message": ":err"}),
	"E_WRONG_NUMBER_OF_ARGUMENTS": new SpaceifyError({"code": 1, "message": "Wrong number of arguments: :number expected."}),
	"E_ADMIN_NOT_LOGGED_IN": new SpaceifyError({"code": 2, "message": "Administrator must be logged in to perform this operation."}),
	"E_PACKAGE_NOT_INSTALLED": new SpaceifyError({"code": 2, "message": "Package :name is not installed."}),

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

	// Core
	"E_GET_SERVICE_UNKNOWN": new SpaceifyError({"code": 2000, "message": "Get service failed because service :name was not found."}),
	"E_GET_SERVICE_UNKNOWN_ADDRESS": new SpaceifyError({"code": 2001, "message": "Get service failed because callers remote address is unknown."}),
	"E_GET_SERVICE_UNREGISTERED": new SpaceifyError({"code": 2002, "message": "Get service failed because service :name is not registered."}),

	"E_GET_MANIFEST_NOT_FOUND": new SpaceifyError({"code": 2005, "message": "Get manifest failed because application :name was not found."}),

	"E_REGISTER_SERVICE_UNKNOWN_ADDRESS": new SpaceifyError({"code": 2006, "message": "Register service failed because callers remote address :address is unknown."}),
	"E_REGISTER_SERVICE_UNKNOWN_SERVICE_NAME": new SpaceifyError({"code": 2007, "message": "Failed to register service because service name :name is unknown (not introduced in manifest)."}),
	"E_UNREGISTER_SERVICE_UNKNOWN_ADDRESS": new SpaceifyError({"code": 2008, "message": "Unregistering service failed because callers remote address :address is unknown."}),
	"E_UNREGISTER_SERVICE_UNKNOWN_SERVICE_NAME": new SpaceifyError({"code": 2009, "message": "Failed to unregister service because service name :name is unknown (not introduced in manifest)."}),

	"E_ADMIN_LOGIN_ERROR": new SpaceifyError({"code": 2010, "message": "Admin log in failed."}),
	"E_ADMIN_LOGOUT_ERROR": new SpaceifyError({"code": 2011, "message": "Admin log out failed."}),
	"E_ADMIN_LOGIN_DENIED": new SpaceifyError({"code": 2012, "message": "Access denied."}),
	"E_ADMIN_LOGIN_USER": new SpaceifyError({"code": 2013, "message": "Failed to get user data."}),
	"E_ADMIN_LOGIN_PASSWORD": new SpaceifyError({"code": 2014, "message": "The password is incorrect."}),
	"E_ADMIN_SESSION_UNKNOWN": new SpaceifyError({"code": 2015, "message": "Unknown session identifier."}),
	"E_ADMIN_SESSION_INVALID": new SpaceifyError({"code": 2016, "message": "Invalid session identifier."}),

 	"E_EDGE_LOGIN": new SpaceifyError({"code": 2017, "message": "Edge login to spaceify.net failed."}),

	"E_INVALID_SESSION": new SpaceifyError({"code": 2018, "message": "Invalid session identifier or session IP and caller IP do not match."}),
	"E_UNKNOWN_APPLICATION": new SpaceifyError({"code": 2019, "message": "Application with the unique_identifier :name is not installed."}),

	"E_UNKNOWN_MAC": new SpaceifyError({"code": 2020, "message": "Callers MAC address is unknown."}),

	"E_SPLASH_ADD_FAILED": new SpaceifyError({"code": 2021, "message": "Failed to add the MAC address to the accepted addresses list."}),

	"E_GET_APP_DATA_FAILED": new SpaceifyError({"code": 2022, "message": "Failed to get application data."}),

	"E_FAILED_TO_START_SPACELET": new SpaceifyError({"code": 2023, "message": "Failed to start spacelet."}),

	"E_NON_EDGE_CALLER": new SpaceifyError({"code": 2024, "message": "Calls outside of the Spaceify edge are forbidden."}),

	"E_APPLICATION_CAN_NOT_START_SPACELET": new SpaceifyError({"code": 2026, "message": "Applications can not start spacelets."}),

	"E_NOT_A_SPACELET_SERVICE": new SpaceifyError({"code": 2027, "message": "Service :name is not registered to any spacelet."}),

	"E_GET_APP_URL_FAILED": new SpaceifyError({"code": 2028, "message": "Failed to get application URLs."}),

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

	// ApplicationManager
	"E_FAILED_TO_INSTALL_APPLICATION": new SpaceifyError({"code": 7000, "message": "Failed to install application."}),
	"E_FAILED_TO_RESOLVE_PACKAGE": new SpaceifyError({"code": 7001, "message": ":package does not resolve to any known package."}),
	"E_FAILED_TO_UPDATE_SETTINGS": new SpaceifyError({"code": 7002, "message": "Failed to update settings."}),
	"E_FAILED_TO_FIND_GIT_APPLICATION": new SpaceifyError({"code": 7003, "message": "The application directory was not found from the git repository :repo."}),
	"E_FAILED_TO_REMOVE_APPLICATION": new SpaceifyError({"code": 7004, "message": "Failed to remove application."}),
	"E_LOCKED": new SpaceifyError({"code": 7007, "message": "Another process has locked the application manager."}),
	"E_SERVICE_ALREADY_REGISTERED": new SpaceifyError({"code": 7008, "message": "Applications with same service names can not be installed at the same time."}),
	"E_FAILED_TO_LIST_APPLICATIONS": new SpaceifyError({"code": 7009, "message": "Failed to list applications."}),
	"E_FAILED_CERTIFICATE_CREATE": new SpaceifyError({"code": 7010, "message": "Failed to create certificate for the application."}),
	"E_FAILED_GITHUB_DATA": new SpaceifyError({"code": 7011, "message": "Failed to get data from GitHub."}),
	"E_FAILED_TO_PROCESS_PACKAGE": new SpaceifyError({"code": 7012, "message": "Getting package from :package failed."}),
	"E_AUTHENTICATION_FAILED": new SpaceifyError({"code": 7013, "message": "Authentication failed."}),

	// SandboxedManager
	"E_SANDBOXED_FAILED_INIT_ITSELF": new SpaceifyError({"code": 8000, "message": "Sandboxed application failed to initialize itself. :err"}),

	// SpaceletManager
	"E_SPACELET_FAILED_INIT_ITSELF": new SpaceifyError({"code": 9000, "message": "Spacelet failed to initialize itself. :err"}),

	// Manager
	"E_MANAGER_FAILED_TO_READ_MANIFEST": new SpaceifyError({"code": 10000, "message": "Unable to read/parse manifest of :type :unique_name."}),
	"E_MANAGER_FAILED_TO_RUN": new SpaceifyError({"code": 10001, "message": "Failed to run :type :unique_name."}),
	
	// WebServer
	"E_INTERNAL_SERVER_ERROR": new SpaceifyError({"code": 500, "message": "<!DOCTYPE html><html><head><title>Server Error</title></head><body><h1>500 Internal Server Error</h1><h3>:server_name at :hostname Port :port</h3></body></html>"}),
	"E_MOVED_PERMANENTLY": new SpaceifyError({"code": 301, "message": '<!DOCTYPE html><html><head><title>Redirection</title></head><body><h1>301 Moved Permanently</h1>The requested document is located in <a href=":location">here</a>.<h3>:server_name at :hostname Port :port</h3></body></html>'}),

	"E_MOVED_FOUND": new SpaceifyError({"code": 302, "message": '<!DOCTYPE html><html><head><title>Redirection</title></head><body><h1>302 Found</h1>The requested document is located in <a href=":location">here</a>.<h3>:server_name at :hostname port :port</h3></body></html>'}),
	"E_WEBSERVER_FATAL_ERROR": new SpaceifyError({"code": 10000, "message": "Fatal error in WebServer :hostname::port - :err"}),

	// ConnectionHub
	"E_CONNECTIONHUB_CONNECTO": new SpaceifyError({"code": 11000, "message": "Connection to :port failed. :err"}),

	// SPM
	"E_SPM_ARGUMENTS": new SpaceifyError({"code": 12000, "message": "Wrong number of arguments."}),
	"E_SPM_UNKNOWN_COMMAND": new SpaceifyError({"code": 12001, "message": "Unknown command :command."}),
	"E_SPM_CONNECTION_FAILED": new SpaceifyError({"code": 12002, "message": "Failed to connect to the Application manager."}),
	"E_SPM_START_SERVER_CONNECTION": new SpaceifyError({"code": 12003, "message": "Failed to start RPC server."}),

	"E_SPM_ARGUMENTS_ONE": new SpaceifyError({"code": 12004, "message": "The :command command must have one arguments: package."}),
	"E_SPM_ARGUMENTS_TWO": new SpaceifyError({"code": 12005, "message": "The :command command must have one or two arguments: [authenticate] package."}),

	// CONNECTIONS
	"E_RPC_EXECUTE_EXCEPTION": new SpaceifyError({"code": 13000, "message": "Exception in executing a RPC method."}),
	"E_NOT_OBJECT": new SpaceifyError({"code": 12014, "message": "Object is of wrong type."}),

	// DataBase
	"E_DATABASE_OPEN": new SpaceifyError({"code": 12000, "message": "Failed to open database connection."}),
	"E_DATABASE_BEGIN": new SpaceifyError({"code": 12001, "message": "Failed to begin transaction."}),
	"E_DATABASE_COMMIT": new SpaceifyError({"code": 12002, "message": "Failed to commit transaction."}),
	"E_DATABASE_ROLLBACK": new SpaceifyError({"code": 12003, "message": "Failed to rollback transaction."}),
	"E_DATABASE_GET_APPLICATION": new SpaceifyError({"code": 12004, "message": "Failed to get application."}),
	"E_DATABASE_GET_APPLICATIONS": new SpaceifyError({"code": 12005, "message": "Failed to get applications."}),
	"E_DATABASE_INSERT_APPLICATION": new SpaceifyError({"code": 12006, "message": "Failed to insert application."}),
	"E_DATABASE_UPDATE_APPLICATION": new SpaceifyError({"code": 12007, "message": "Failed to update application."}),
	"E_DATABASE_REMOVE_APPLICATION": new SpaceifyError({"code": 12008, "message": "Failed to remove application."}),
	"E_DATABASE_UPDATE_SETTINGS": new SpaceifyError({"code": 12009, "message": "Failed ot update settings."}),
	"E_DATABASE_GET_SETTINGS": new SpaceifyError({"code": 12010, "message": "Failed to ge settings."}),
	"E_DATABASE_GET_SETTING": new SpaceifyError({"code": 12011, "message": "Failed to get setting."}),
	"E_DATABASE_GET_USERDATA": new SpaceifyError({"code": 12012, "message": "Failed to get user data."}),
	"E_DATABASE_ADMIN_LOGGED_IN": new SpaceifyError({"code": 12013, "message": "Failed to set admin log in."}),

	// ValidatePackage
	"E_NO_APPLICATION_DIRECTORY": new SpaceifyError({"code": 13000, "message": "Package does not have application directory."}),
	"E_NO_MANIFEST_FILE": new SpaceifyError({"code": 13001, "message": "Package does not have manifest file."}),

	"E_INJECT_FILE": new SpaceifyError({"code": 13002, "message": "Inject file :file is defined in the manifest but is not found in the applications www directory :directory."}),
	"E_IMAGE_FILE": new SpaceifyError({"code": 13003, "message": "Image file :file is defined in the manifest but is not found in the applications image directory :directory."}),
	"E_IMAGE_TYPES": new SpaceifyError({"code": 13004, "message": "Supported image formats are jpg, gif and png."}),
	"E_DOCKER_IMAGE": new SpaceifyError({"code": 13005, "message": "Custom Docker image creation is defined but file Dockerfile is not found from applications directory."}),

	"E_MANIFEST_TYPE": new SpaceifyError({"code": 13006, "message": "Manifest must have type field defined and type must be spacelet, sandboxed or native."}),

	// Connection hub
	"E_ACCESS_DENIED_TO_PORT": new SpaceifyError({"code": 14000, "message": "Access denied to port :port."}),
	
	/* ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** **
	** TEXTS ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** **
	** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** */
	// COMMON

	// CONNECTIONS / ACCESS
	"NO_CONNECTION_TO_SERVER": "No connection to server.",
	"ACCESS_DENIED": "Access denied.",
	"PROTOCOLS_DENIED": "Access denied. Unsupported protocol(s).",
	"REMOTE_DENIED": "Access denied for remote clients.",
	"APPMAN_LOCKED": "Another process has locked the application manager.",

	// WebServer
	"WEBSERVER_CONNECTING": ":owner/WebServer::connect :protocol://:hostname::port",
	"WEBSERVER_CLOSING": ":owner/WebServer::close :protocol://:hostname::port",

	// WebSocketConnection, WebSocketRPCConnection, WebSocketRPCServer, WebSocketServer
	"WEBSOCKET_OPENING": ":owner/:class::open :protocol://:hostname::port/:subprotocol",
	"WEBSOCKET_CONNECTING": ":owner/:class::connect to :protocol://:hostname::port/:subprotocol",
	"WEBSOCKET_CLOSING": ":owner/:class::close server :protocol://:hostname::port/:subprotocol",
	"WEBSOCKET_CLOSING_WEB": ":owner/:class::close web server :protocol://:hostname::port",
	"WEBSOCKET_CLOSE_CONNECTION": ":owner/:class::closeConnection :origin :protocol://:hostname::port/:subprotocol, id=:id",
	"WEBSOCKET_CONNECTION_REQUEST": ":owner/:class::connectionRequest from :origin :protocol://:address::port",
	"WEBSOCKET_SEND_MESSAGE": ":owner/:class::sendMessage :protocol://:hostname::port/:subprotocol, id=:id, message=:message",
	"WEBSOCKET_SEND_BINARY": ":owner/:class::sendBinary :protocol://:hostname::port/:subprotocol, id=:id, length=:length",
	"WEBSOCKET_NOTIFY_ALL": ":owner/:class::notifyAll :protocol://:hostname::port/:subprotocol",
	"WEBSOCKET_ON_MESSAGE": ":owner/:class::onMessage :protocol://:hostname::port/:subprotocol, id=:id, message=:message",

	// EngineIoRPCServer
	"ENGINE_IO_OPENING": ":owner/:class::open :protocol://:hostname::port",
	"ENGINE_IO_CLOSING": ":owner/:class::close server :protocol://:hostname::port",
	"ENGINE_IO_CLOSING_WEB": ":owner/:class::close web server :protocol://:hostname::port",
	"ENGINE_IO_CLOSE_CONNECTION": ":owner/:class::closeConnection :origin :protocol://:address::port, id=:id",
	"ENGINE_IO_CONNECTION_REQUEST": ":owner/:class::connectionRequest from :origin :protocol://:address::port",
	"ENGINE_IO_SEND_MESSAGE": ":owner/:class::sendMessage :protocol://:hostname::port, id=:id, message=:message",
	"ENGINE_IO_SEND_BINARY": ":owner/:class::sendBinary :protocol://:hostname::port/:subprotocol, id=:id, length=:length",
	"ENGINE_IO_NOTIFY_ALL": ":owner/:class::notifyAll :protocol://:hostname::port",
	"ENGINE_IO_SEND_STRING_MESSAGE": ":owner/:class::sendStringMessage :protocol://:hostname::port, id=:id, message=:message",
	"ENGINE_IO_ON_MESSAGE": ":owner/:class::onMessage :protocol://:hostname::port, id=:id, message=:message",

	// DockerHelper
	"EXECUTE_COMMAND": "Trying to execute command:\n:command\n",
	"EXECUTE_COMMAND_RECEIVED": "Received the end code ':code' from stdout.",

	// DockerImage
	"STOP_CONTAINER": "Stopping temporary container: :container.",
	"REMOVE_CONTAINER": "Removing temporary container: :container.",

	// Core
	"LOGGED_IN_SPACEIFY_NET": "Logged in to spaceify.net - edge_id: :edge_id.",
	"LOGGING_IN_SPACEIFY_NET_FAILED": "Logging in to spaceify.net failed: :result.",
	"LOGGED_OUT_SPACEIFY_NET": "Logged out of spaceify.net.",

	// ApplicationManager
	"RESOLVING_ORIGIN": "Resolving package origin...",
	"CHECKING_FROM": "Checking :where",
	"PACKAGE_FOUND": "Package :package found from :where",
	"TRYING_TO_PUBLISH": "Trying to publish :where",
	"LOCAL_DIRECTORY": "local directory.",
	"WORKING_DIRECTORY": "current working directory.",
	"LOCAL_ARCHIVE": "local Zip archive.",
	"WORKING_DIRECTORY_ARCHIVE": "Zip archive in the current working directory.",
	"GIT_REPOSITORY": "the GitHub repository.",
	"REMOTE_ARCHIVE": "remote Zip archive.",
	"SPACEIFY_REGISTRY": "the Spaceify registry.",
	"DOWNLOADING_GITUHB": "(:pos/:count) Downloading :what (:bytes bytes)",

	"PACKAGE_POSTING": "Please wait, posting the package to the Spaceify registry.",
	"PACKAGE_POST_ERROR": "Failed to publish the package.",
	"PACKAGE_POST_OK": "Success. The package is now published.",
	"PACKAGE_REMOVED": ":type is now removed.",
	"PACKAGE_VALIDATING": "Validating package.",
	"PACKAGE_STOPPING": "Stopping :type :name.",
	"PACKAGE_STOPPING_EXISTING": "Stopping already installed :type :name.",
	"PACKAGE_STOPPED": ":type is now stopped.",
	"PACKAGE_REMOVING": "Removing :type :name:",
	"PACKAGE_STARTING": "Starting :type :name.",
	"PACKAGE_STARTED": ":type is now started.",
	"PACKAGE_RESTARTED": "The :type is now restarted.",
	"PACKAGE_ALREADY_STOPPED": ":type :name is already stopped.",
	"PACKAGE_ALREADY_RUNNING": ":type :name is already running.",
	"PACKAGE_INSTALL_ERROR": "Failed to get the requested package.",
	"PACKAGE_REMOVE_FROM_DATABASE": " - Application entries from the database.",
	"PACKAGE_REMOVING_DOCKER": " - Docker image and container.",
	"PACKAGE_DELETE_FILES": " - Application files.",

	"INSTALL_APPLICATION": "Installing :type :name:",
	"INSTALL_APPLICATION_FILES": " - Copying files to volume.",
	"INSTALL_GENERATE_CERTIFICATE": " - Generating Spaceify CA signed certificate.",
	"INSTALL_CREATE_DOCKER_IMAGE": " - Creating custom Docker image :image.",
	"INSTALL_CREATE_DOCKER": " - Creating Docker image from the default image :image.",
	"INSTALL_UPDATE_DATABASE": " - Writing database entries.",
	"INSTALL_APPLICATION_OK": ":type :name@:version is now installed.",

	"SERVICE_ALREADY_REGISTERED": "Service name :service_name is already registered by application :unique_name",

	"GET_SOURCES_OK": "Source codes are now loaded and are in the directory :directory.",

	"PACKAGE_POST_REGISTER": "Please wait, registering this edge computer with edge id: :edge_uiid",
	"PACKAGE_POST_REGISTER_ERROR": "Registration failed. ",
	"PACKAGE_POST_REGISTER_OK": "Success. This edge computer is now registered.",

	"ALREADY_REGISTERED": "The registration file edge_id.uuid was found containing edge id :edge_uiid. Previous registration is valid.",

	"REQUIRED_SERVICE_NOT_AVAILABLE": "Required service ':service_name' is not registered to the edge. Because suggested application is not defined for the required service, edge can not try to install application which implements the service. Search Spaceify's repository (:url) or third party repositories for applications that implement the service and install suitable application manually.",
	"REQUIRED_SERVICE_ALREADY_REGISTERED": "Required service ':service_name' is registered by application ':unique_name@:version'. Because suggested application is not defined for the required service, the already installed application provides the service this applications requires.",
	"REQUIRED_SERVICE_INSTALL_SA": "Required service ':service_name' is not registered to the edge. Spm tries to install the suggested application ':unique_name'.",
	"REQUIRED_SERVICE_DIFFERENT_APPS": "Required service ':service_name' is already provided by application ':unique_name@:version'. The suggested application ':sapp' is not installed. If you prefer to use the suggested application remove the existing application and then install the suggested application manually.",
	"REQUIRED_SERVICE_SAME_APPS": "Required service ':service_name' is provided by the same application ':unique_name@:version' as the suggested application. The suggested application ':sapp' is not reinstalled.",

	// SPM
	"AUTHENTICATION": "Enter user authentication for :auth.",
	"USERNAME": "Username: ",
	"PASSWORD": "Password: ",

	"NO_APPLICATIONS": "No applications to list.",
	"INSTALLED_SPACELETS": "Installed spacelets.",
	"INSTALLED_SANDBOXED": "Installed sandboxed applications.",
	"INSTALLED_NATIVE": "Installed native applications.",

	"M_NAME": "Name: ",
	"M_START_COMMAND": "Start command: ",
	"M_STOP_COMMAND": "Stop command: ",
	"M_DOCKER_IMAGE": "Docker image: ",
	"M_INSTALL_COMMANDS": "Install commands: ",
	"M_IMPLEMENTS": "Implements: ",
	"M_SHORT_DESCRIPTION": "Short Description: ",
	"M_KEY_WORDS": "Key words: ",
	"M_LICENSE": "License: ",
	"M_IMAGES": "Images ",
	"M_REPOSITORY": "Repository: ",
	"M_WEB_URL": "Web URL: ",
	"M_BUGS": "Bugs: ",
	"M_CATEGORY": "Category: ",
	"M_SHARED": "Shared: ",
	"M_YES": "Yes",
	"M_NO": "No",
	"M_INJECT": "Inject",
	"M_INJECT_ENABLED": "Enabled: ",
	"M_ORIGINS": "Origins ",
	"M_INJECT_IDENTIFIER": "Identifier: ",
	"M_INJECT_HOSTNAMES": "Hostnames",
	"M_INJECT_FILES": "Files",
	"M_DEVELOPER": "Developer: ",
	"M_CONTRIBUTORS": "Contributors",
	"M_CREATION_DATE": "Creation date: ",
	"M_PUBLISH_DATE": "Publish date: ",
	"M_INSTALLATION_DATE": "Installation date: ",
	"M_PROVIDES_SERVICES": "Provides services",
	"M_REQUIRES_SERVICES": "Requires services",
	"M_IS_RUNNING": "Is running: ",

	"APPLICATION_DISPLAY_NAMES": {"spacelet": "spacelet", "sandboxed": "application", "native": "native application"}
	};

module.exports = language;
