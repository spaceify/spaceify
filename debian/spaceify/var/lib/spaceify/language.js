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
	"E_FAILED_TO_INITIATE_HTTP_GET": new SpaceifyError({"code": 1000, "message": "Failed to initiate HTTP(S) GET"}),
	"E_FAILED_TO_LOAD_REMOTE_FILE": new SpaceifyError({"code": 1001, "message": "Failed to load remote file: :file, status code: :code"}),
	"E_FAILED_TO_INITIATE_HTTP_POST": new SpaceifyError({"code": 1002, "message": "Failed to initiate HTTP(S) POST"}),
	"E_FAILED_TO_POST_FORM": new SpaceifyError({"code": 1003, "message": "Failed to POST a form: :url, status code: :code"}),
	"E_MANIFEST_FIELD_SERVICES": new SpaceifyError({"code": 1004, "message": "Manifest must have provided_service and optionally required_service fields"}),
	"E_MANIFEST_FIELD_TYPE": new SpaceifyError({"code": 1005, "message": "Manifest must have type field"}),
	"E_MANIFEST_FIELD_NAME": new SpaceifyError({"code": 1006, "message": "Manifest must have name field"}),
	"E_MANIFEST_FIELD_UNIQUE_NAME": new SpaceifyError({"code": 1007, "message": "Manifest must have unique_name field"}),
	"E_MANIFEST_FIELD_VERSION": new SpaceifyError({"code": 1008, "message": "Manifest must have version field"}),
	"E_MANIFEST_FIELD_CATEGORY": new SpaceifyError({"code": 1009, "message": "Manifest must have category field"}),
	"E_MANIFEST_FIELD_START_COMMAND": new SpaceifyError({"code": 1010, "message": "Manifest must have start_command field"}),
	"E_MANIFEST_FIELD_SHARED": new SpaceifyError({"code": 1011, "message": "Manifest must have shared field"}),
	"E_MANIFEST_FIELD_INJECT_IDENTIFIER": new SpaceifyError({"code": 1012, "message": "Manifest must have iject_identifier field"}),
	"E_MANIFEST_FIELD_INJECT_HOSTNAMES": new SpaceifyError({"code": 1013, "message": "Manifest must have inject_hostnames field"}),
	"E_MANIFEST_FIELD_INJECT_FILES": new SpaceifyError({"code": 1014, "message": "Manifest must have inject_files field"}),
	"E_PROVIDED_FIELDS_UNDEFINED": new SpaceifyError({"code": 1015, "message": "Manifest file must have provided_services objects and the objects must have properly defined service_name and service_type fields"}),
	"E_REQUIRED_FIELDS_UNDEFINED": new SpaceifyError({"code": 1016, "message": "Manifest file must have required_services objects and the objects must have properly defined service_name and service_type fields"}),
	"E_REQUIRED_INJECT_UNDEFINED": new SpaceifyError({"code": 1017, "message": "Spacelet manifest file must have inject_files objects and the objects must have properly defined directory, name and type fields"}),

	// SpaceifyCore
	"E_FIND_SERVICE_UNKNOWN": new SpaceifyError({"code": 2000, "message": "Find service failed because service :name was not found"}),
	"E_FIND_SERVICE_UNKNOWN_ADDRESS": new SpaceifyError({"code": 2001, "message": "Find service failed because callers remote address is unknown"}),
	"E_FIND_SERVICE_UNREGISTERED": new SpaceifyError({"code": 2002, "message": "Find service failed because service is not registered"}),

	"E_REGISTER_SERVICE_UNKNOWN_ADDRESS": new SpaceifyError({"code": 2004, "message": "Register service failed because callers remote address :address is unknown"}),
	"E_REGISTER_SERVICE_UNKNOWN_SERVICE_NAME": new SpaceifyError({"code": 2005, "message": "Failed to register service because service name :name is unknown (not introduced in manifest)"}),
	"E_UNREGISTER_SERVICE_UNKNOWN_ADDRESS": new SpaceifyError({"code": 2006, "message": "Unregistering service failed because callers remote address :address is unknown"}),
	"E_UNREGISTER_SERVICE_UNKNOWN_SERVICE_NAME": new SpaceifyError({"code": 2007, "message": "Failed to unregister service because service name :name is unknown (not introduced in manifest)"}),

	"E_ADMIN_LOGIN_ERROR": new SpaceifyError({"code": 2008, "message": "Admin log in failed"}),
	"E_ADMIN_LOGOUT_ERROR": new SpaceifyError({"code": 2008, "message": "Admin log in failed"}),
	"E_ADMIN_LOGIN_ADDRESS": new SpaceifyError({"code": 2009, "message": "Callers remote address is unknown"}),
	"E_ADMIN_LOGIN_USER": new SpaceifyError({"code": 2010, "message": "Failed to get user data"}),
	"E_ADMIN_LOGIN_PASSWORD": new SpaceifyError({"code": 2011, "message": "The password is incorrect"}),
	"E_ADMIN_SESSION_UNKNOWN": new SpaceifyError({"code": 2012, "message": "Unknown session identifier"}),
	"E_ADMIN_SESSION_INVALID": new SpaceifyError({"code": 2013, "message": "Invalid session identifier"}),

 	"E_EDGE_LOGIN": new SpaceifyError({"code": 2014, "message": "Edge login to spaceify.net failed"}),

	"E_OPTIONS_SESSION_INVALID": new SpaceifyError({"code": 2015, "message": "Invalid session identifier"}),
	"E_OPTIONS_UNKNOWN_APPLICATION": new SpaceifyError({"code": 2016, "message": "Application with the unique_identifier :name was not found"}),

	"E_UNKNOWN_MAC": new SpaceifyError({"code": 2017, "message": "Callers MAC address is unknown"}),

	"E_SPLASH_ADD_FAILED": new SpaceifyError({"code": 2018, "message": "Failed to add the MAC address to the accepted addresses list"}),

	// Common
	"E_FAILED_TO_LOAD_MANIFEST": new SpaceifyError({"code": 3001, "message": "Failed to load manifest file"}),
	"E_MANIFEST_PARSE_FAILED": new SpaceifyError({"code": 3002, "message": "Failed to parse manifest file content"}),
	"E_JSON_PARSE_FAILED": new SpaceifyError({"code": 3003, "message": "Failed to parse json"}),
	"E_FAILED_TO_LOAD_APPLICATION": new SpaceifyError({"code": 3004, "message": "Failed to load application file"}),
	"E_FAILED_TO_GET_SETTINGS": new SpaceifyError({"code": 3005, "message": "Failed read settings from the database"}),

	// DockerContainer
	"E_CREATE_CONTAINER_FAILED": new SpaceifyError({"code": 4000, "message": "Creating the container failed"}),
	"E_INIT_CONTAINER_FAILED": new SpaceifyError({"code": 4001, "message": "Initializing the container failed"}),
	"E_START_CONTAINER_FAILED": new SpaceifyError({"code": 4002, "message": "Starting the container failed"}),
	"E_CONTAINER_INSPECT_FAILED": new SpaceifyError({"code": 4003, "message": "Inspecting the container failed"}),
	"E_STOPPING_CONTAINER_FAILED": new SpaceifyError({"code": 4004, "message": "Stopping a docker container failed: :err"}),
	"E_EXECUTING_COMMAND_FAILED": new SpaceifyError({"code": 4005, "message": "Executing command in a docker container failed"}),
	"E_COPYING_FILE_FAILED": new SpaceifyError({"code": 4006, "message": "Copying file to a docker container failed"}),

	// SshHelper
	"E_EXECUTE_COMMAND_FAILED": new SpaceifyError({"code": 5000, "message": "."}),
	"E_ERRORS_IN_COMMANDS": new SpaceifyError({"code": 5001, "message": "."}),
	"E_WRITE_FILE_FAILED": new SpaceifyError({"code": 5002, "message": "Failed to write file"}),
	"E_NETCAT_FAILED": new SpaceifyError({"code": 5003, "message": "Failed to start netcat"}),

	// DockerHelper
	"E_ATTACH_CONTAINER_FAILED": new SpaceifyError({"code": 6000, "message": "Attaching container failed"}),
	"E_ATTACH_CONTAINER_OUTPUT": new SpaceifyError({"code": 6001, "message": "(output stream) :err"}),
	"E_ATTACH_CONTAINER_INPUT": new SpaceifyError({"code": 6002, "message": "(input stream) :err"}),
	"E_SEND_FILE_CONNECT_FAILED": new SpaceifyError({"code": 6003, "message": "Failed to open connection"}),
	"E_SEND_FILE_COPY_FAILED": new SpaceifyError({"code": 6004, "message": "Failed to copy file"}),

	// AppManager
	"E_FAILED_TO_INSTALL_APPLICATION": new SpaceifyError({"code": 7000, "message": "Failed to install application"}),
	"E_FAILED_TO_RESOLVE_PACKAGE": new SpaceifyError({"code": 7001, "message": ":package doesn't resolve to any known package."}),
	"E_FAILED_TO_UPDATE_SETTINGS": new SpaceifyError({"code": 7002, "message": "Failed to update settings"}),
	"E_FAILED_TO_FIND_GIT_APPLICATION": new SpaceifyError({"code": 7003, "message": "The application directory was not found from the git repository :repo."}),
	"E_FAILED_TO_REMOVE_APPLICATION": new SpaceifyError({"code": 7004, "message": "Failed to remove application"}),
	"E_APPLICATION_NOT_INSTALLED": new SpaceifyError({"code": 7005, "message": "Application :name is not installed"}),
	"E_CORE_NOT_RUNNING": new SpaceifyError({"code": 7006, "message": "Can not :command application because core is not running."}),
	"E_LOCKED": new SpaceifyError({"code": 7007, "message": "Another process has locked the application manager."}),
	"E_SERVICE_ALREADY_REGISTERED": new SpaceifyError({"code": 7008, "message": "Applications with same service names can not be installed at the same time."}),

	// SandboxedApplicationManager
	"E_SANDBOXEDAPP_FAILED_TO_READ_MANIFEST": new SpaceifyError({"code": 8000, "message": "Unable to read/parse manifest file from sandboxed applications directory"}),
	"E_SANDBOXEDAPP_FAILED_INIT_ITSELF": new SpaceifyError({"code": 8001, "message": "Sandboxed application failed to initialize itself"}),
	"E_SANDBOXEDAPP_START_FAILED_UNKNOWN_UNIQUE_NAME": new SpaceifyError({"code": 8002, "message": "Failed to start sandboxed application because unique name :name is unknown"}),

	// SpaceletManager
	"E_SPACELET_FAILED_INIT_ITSELF": new SpaceifyError({"code": 9000, "message": "Spacelet failed to initialize itself"}),
	"E_FAILED_TO_READ_SPACELET_MANIFEST": new SpaceifyError({"code": 9001, "message": "Unable to read/parse manifest file from spacelets directory"}),
	"E_FAILED_TO_READ_SPACELET_INFO": new SpaceifyError({"code": 9002, "message": "Failed to load spacelets information from the database"}),

	// WebServer
	"E_INTERNAL_SERVER_ERROR": new SpaceifyError({"code": 500, "message": "<!DOCTYPE html><html><head><title>Server Error</title></head><body><h1>500 Internal Server Error</h1><h3>:server_name at :hostname Port :port</h3></body></html>"}),	
	"E_MOVED_PERMANENTLY": new SpaceifyError({"code": 301, "message": '<!DOCTYPE html><html><head><title>Redirection</title></head><body><h1>301 Moved Permanently</h1>The requested document is located in <a href=":location">here</a>.<h3>:server_name at :hostname Port :port</h3></body></html>'}),

	"E_MOVED_FOUND": new SpaceifyError({"code": 302, "message": '<!DOCTYPE html><html><head><title>Redirection</title></head><body><h1>302 Found</h1>The requested document is located in <a href=":location">here</a>.<h3>:server_name at :hostname Port :port</h3></body></html>'}),
	"E_WEBSERVER_FAILED_START": new SpaceifyError({"code": 10000, "message": "WebServer :hostname::port failed to start :err"}),

	// SPM
	"E_WRONG_NUMBER_OF_ARGUMENTS": new SpaceifyError({"code": 11000, "message": "Wrong number of arguments. Expected: :commands [:options] <package>"}),
	"E_UNKNOW_COMMAND": new SpaceifyError({"code": 11001, "message": "Unknow command :command. Expected: :commands"}),
	"E_UNKNOW_OPTION": new SpaceifyError({"code": 11002, "message": "Unknow option :option. Expected: :options"}),

	// CONNECTIONS
	"RPC_EXECUTE_EXCEPTION": new SpaceifyError({"code": 12000, "message": "Exception in executing a RPC method"}),

	/* ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** 
	** TEXTS ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** **
	** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** */

	// CONNECTIONS
	"NO_CONNECTION_TO_SERVER": "No connection to server",

	// WebServer
	"WEBSERVER_CONNECTING": ":owner::WebServer::connect() :protocol://:hostname::port",
	"WEBSERVER_CLOSING": ":owner::WebServer::close() :protocol://:hostname::port",

	// WebSocketClient, WebSocketRPCClient, WebSocketRPCServer
	"WEBSOCKET_CONNECTING": ":owner:::class::connect() to :protocol://:hostname::port/:subprotocol",
	"WEBSOCKET_CLOSING": ":owner:::class::close() server :protocol://:hostname::port/:subprotocol",
	"WEBSOCKET_CLOSING_WEB": ":owner:::class::close() web server :protocol://:hostname::port",	
	"WEBSOCKET_CLOSE_CONNECTION": ":owner:::class::closeConnection() :origin :protocol://:hostname::port/:subprotocol, id=:id",	
	"WEBSOCKET_CONNECTION_REQUEST": ":owner:::class::connectionRequest() from :origin :protocol://:hostname::port, id=:id",
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
	"EXECUTE_COMMAND_RECEIVED": "Received the end code :code from stdout.",
	"NETCAT_CONNECT": "Trying to connect to netcat at :ip/:port,",
	"NETCAT_CONNECTED": "Connected to netcat.",
	"NETCAT_FINISHED": "Copying the file finished.",

	// DockerImage
	"STOP_CONTAINER": "Stopping temporary container: :container",
	"REMOVE_CONTAINER": "Removing temporary container: :container",

	// SpaceifyCore
	"LOGGED_IN_SPACEIFY_NET": "Logged in to spaceify.net - edge_id: :edge_id",
	"LOGGING_IN_SPACEIFY_NET_FAILED": "Logging in to spaceify.net failed: :result",
	"LOGGED_OUT_SPACEIFY_NET": "Logged out of spaceify.net",
	
	// AppManager
	"TRYING_TO_INSTALL": "Trying to install package :package from :from",
	"TRYING_TO_PUBLISH": "Trying to publish :what",
	"LOCAL_DIRECTORY": "a local directory.",
	"LOCAL_ARCHIVE": "a local Zip archive.",
	"GIT_REPOSITORY": "the GitHub repository.",
	"REMOTE_ARCHIVE": "a remote Zip archive.",
	"SPACEIFY_REGISTRY": "the Spaceify registry.",
	"DOWNLOADING_GITUHB": "(:pos/:count) Downloading :what (:bytes bytes) from :where",
	"POSTING_PACKAGE": "Please wait, posting the package to the Spaceify registry.",
	"PACKAGE_POST_ERROR": "Failed to publish the package.",
	"PACKAGE_POST_OK": "Success. The package is now published.",
	"APPLICATION_REMOVED": "Application :app is now removed.",
	"INSTALL_PARSING_MANIFEST": "Parsing manifest.",
	"STOPPING_APPLICATION": "Stopping application.",
	"STARTING_APPLICATION": "Starting application.",
	"INSTALL_GENERATE_CERTIFICATE": "Generating a Spaceify CA signed certificate for the application.",
	"INSTALL_CERTIFICATE_EXISTS": "Using existing certificate.",
	"REMOVING_DOCKER": "Removing existing Docker image and container.",
	"DELETE_FILES": "Deleting existing application files.",
	"INSTALL_CREATE_DOCKER": "Creating a Docker image for the application from the default image :image.",
	"INSTALL_CREATE_CUSTOM_DOCKER": "Creating a custom Docker image :image for the application.",
	"INSTALL_UPDATE_DATABASE": "Writing database entries for the application.",
	"INSTALL_APPLICATION_FILES": "Copying application and API files.",
	"INSTALL_APPLICATION_OK": "Application :app@:version is now installed.",
	"REMOVE_FROM_DATABASE": "Removing applications entries from the database.",
	"ALREADY_STOPPED": "Application :app is already stopped.",
	"ALREADY_RUNNING": "Application :app is already running.",
	"SERVICE_ALREADY_REGISTERED": "Service name :name is already registered by application :app",
	"PACKAGE_INSTALL_ERROR": "Failed to get the requested package.",

	"REQUIRED_SERVICE_NOT_AVAILABLE": "Required service :name is not registered to the Spaceify core. Because suggested application is not defined Spaceify core can not try to install an application which implements the service. See http://:name for applications that implement the service and install suitable application manually.",
	"REQUIRED_SERVICE_ALREADY_REGISTERED": "Required service :name is registered by application :app@:version",
	"REQUIRED_SERVICE_INSTALL_SA": "Required service :name is not registered to the Spaceify core. Spm tries to install the suggested application :app.",	
	"REQUIRED_SERVICE_DIFFERENT_APPS": "Required service :name is provided by application :app@:version. The suggested application :sapp is not installed. If you prefer to use the suggested application remove the existing application and then install the suggested application manually.",
	"REQUIRED_SERVICE_SAME_APPS": "Required service :name is provided by the same application :app@:version as the suggested application. The suggested application :sapp is not installed.",

	// SPM
	"AUTHENTICATION": "Authentication requested for :auth_host",
	"USERNAME": "Username: ",
	"PASSWORD": "Password: ",

	"NO_APPLICATIONS": "No applications to list",
	"INSTALLED_SPACELETS": "Installed spacelets",
	"INSTALLED_SANDBOXED": "Installed sandboxed applications",
	"INSTALLED_NATIVE": "Installed native applications",

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
