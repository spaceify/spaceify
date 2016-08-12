"use strict";

/**
 * Spaceify language file, 2013 Spaceify Oy
 *
 *  Locale: en_US
 */

var SpaceifyError = require("./spaceifyerror");

var language =
	{
	/* ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** **
	** ERRORS * ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** **
	** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** */
	// General
	"E_GENERAL_ERROR": new SpaceifyError({"code": "", "message": "~err"}),
	"E_WRONG_NUMBER_OF_ARGUMENTS": new SpaceifyError({"code": 1, "message": "Wrong number of arguments: ~number expected."}),
	"E_ADMIN_NOT_LOGGED_IN": new SpaceifyError({"code": 2, "message": "Administrator must be logged in to perform this operation."}),
	"E_APPLICATION_NOT_INSTALLED": new SpaceifyError({"code": 3, "message": "Application or spacelet ~name is not installed."}),

	// SpaceifyUtility
	"E_LOAD_REMOTE_FILE_FAILED_TO_INITIATE_HTTP_GET": new SpaceifyError({"code": 1000, "message": "Failed to initiate HTTP(S) GET."}),
	"E_LOAD_REMOTE_FILE_FAILED_TO_LOAD_REMOTE_FILE": new SpaceifyError({"code": 1001, "message": "Failed to load remote file: ~file, status code: ~code."}),
	"E_POST_FORM_FAILED_TO_INITIATE_HTTP_POST": new SpaceifyError({"code": 1002, "message": "Failed to initiate HTTP(S) POST."}),
	"E_POST_FORM_FAILED_TO_POST_FORM": new SpaceifyError({"code": 1003, "message": "Failed to POST a form: ~url, status code: ~code."}),
	"E_LOAD_REMOTE_FILE_TO_LOCAL_FILE_FAILED": new SpaceifyError({"code": 1018, "message": "Failed to load remote file."}),
	"E_DELETE_DIRECTORY_FAILED": new SpaceifyError({"code": 1019, "message": "Failed to delete directory."}),
	"E_COPY_DIRECTORY_FAILED": new SpaceifyError({"code": 1020, "message": "Failed copy directory."}),
	"E_MOVE_DIRECTORY_FAILED": new SpaceifyError({"code": 1021, "message": "Failed to move dfirectory."}),
	"E_DELETE_FILE_FAILED": new SpaceifyError({"code": 1022, "message": "Failed to delete file."}),
	"E_COPY_FILE_FAILED": new SpaceifyError({"code": 1023, "message": "Failed to copy file."}),
	"E_MOVE_FILE_FAILED": new SpaceifyError({"code": 1024, "message": "Failed to move file."}),
	"E_ZIP_DIRECTORY_FAILED": new SpaceifyError({"code": 1025, "message": "Failed to compress files."}),
	"E_LOAD_JSON_FAILED": new SpaceifyError({"code": 1026, "message": "Failed to load JSON file."}),
	"E_SAVE_JSON_FAILED": new SpaceifyError({"code": 1027, "message": "Failed to save JSON file."}),
	"E_PARSE_JSON_FAILED": new SpaceifyError({"code": 3003, "message": "Failed to parse JSON."}),

	// Core
	"E_GET_SERVICE_UNKNOWN_SERVICE": new SpaceifyError({"code": 2000, "message": "Get service failed because service ~name was not found."}),
	"E_GET_SERVICE_UNKNOWN_ADDRESS": new SpaceifyError({"code": 2001, "message": "Get service failed because callers remote address is unknown."}),

	"E_GET_MANIFEST_FAILED": new SpaceifyError({"code": 2005, "message": "Get manifest failed because application ~name was not found."}),

	"E_REGISTER_SERVICE_UNKNOWN_ADDRESS": new SpaceifyError({"code": 2006, "message": "Register service failed because callers remote address ~address is unknown."}),
	"E_REGISTER_SERVICE_UNKNOWN_SERVICE_NAME": new SpaceifyError({"code": 2007, "message": "Failed to register service because service name ~name is unknown (not introduced in manifest)."}),
	"E_UNREGISTER_SERVICE_UNKNOWN_ADDRESS": new SpaceifyError({"code": 2008, "message": "Unregistering service failed because callers remote address ~address is unknown."}),
	"E_UNREGISTER_SERVICE_UNKNOWN_SERVICE_NAME": new SpaceifyError({"code": 2009, "message": "Failed to unregister service because service name ~name is unknown (not introduced in manifest)."}),

	"E_INVALID_SESSION": new SpaceifyError({"code": 2018, "message": "Invalid session identifier or session IP and caller IP do not match."}),

	"E_UNKNOWN_MAC": new SpaceifyError({"code": 2020, "message": "Callers MAC address is unknown."}),

	"E_SET_SPLASH_ACCEPTED_FAILED": new SpaceifyError({"code": 2021, "message": "Failed to add the MAC address to the accepted addresses list."}),

	"E_START_SPACELET_FAILED": new SpaceifyError({"code": 2023, "message": "Failed to start spacelet."}),

	"E_START_SPACELET_APPLICATIONS_CAN_NOT_START_SPACELETS": new SpaceifyError({"code": 2026, "message": "Applications can not start spacelets."}),

	"E_GET_APPLICATION_URL_FAILED": new SpaceifyError({"code": 2028, "message": "Failed to get application URLs."}),

	"E_START_SPACELET_SSOP": new SpaceifyError({"code": 2029, "message": "Same Origin Policy rules prevent starting the spacelet."}),

	"E_GET_CORE_SETTINGS_FAILED": new SpaceifyError({"code": 2030, "message": "Failed to get core settings."}),
	"E_SAVE_CORE_SETTINGS_FAILED": new SpaceifyError({"code": 2031, "message": "Failed to save core settings."}),

	"E_GET_EDGE_SETTINGS_FAILED": new SpaceifyError({"code": 2032, "message": "Failed to get edge settings."}),
	"E_SAVE_EDGE_SETTINGS_FAILED": new SpaceifyError({"code": 2033, "message": "Failed to save edge settings."}),

	"E_REGISTER_EDGE_FAILED": new SpaceifyError({"code": 2034, "message": "Edge registration failed: ~result ~httpStatus."}),

	"E_GET_SERVICE_RUNTIME_STATES_FAILED": new SpaceifyError({"code": 2034, "message": "Failed to get service runtime states."}),

	// DockerContainer
	"E_START_CONTAINER_CREATE_CONTAINER_FAILED": new SpaceifyError({"code": 4000, "message": "Creating the docker container failed."}),
	"E_START_CONTAINER_INIT_CONTAINER_FAILED": new SpaceifyError({"code": 4001, "message": "Initializing the docker container failed."}),
	"E_START_CONTAINER_START_CONTAINER_FAILED": new SpaceifyError({"code": 4002, "message": "Starting the docker container failed."}),
	"E_START_CONTAINER_INSPECT_FAILED": new SpaceifyError({"code": 4003, "message": "Inspecting the docker container failed."}),
	"E_STOP_CONTAINER_FAILED": new SpaceifyError({"code": 4004, "message": "Stopping a docker container failed: ~err."}),

	// DockerHelper
	"E_INIT_ATTACH_CONTAINER_OUTPUT_FAILED": new SpaceifyError({"code": 6000, "message": "output stream - ~err"}),
	"E_INIT_ATTACH_CONTAINER_INPUT_FAILED": new SpaceifyError({"code": 6001, "message": "input stream - ~err"}),

	// ApplicationManager
	"E_INSTALL_APPLICATION_FAILED": new SpaceifyError({"code": 7000, "message": "Failed to install application."}),
	"E_FAILED_TO_RESOLVE_PACKAGE": new SpaceifyError({"code": 7001, "message": "~package does not resolve to any known package."}),
	"E_LOCKED": new SpaceifyError({"code": 7007, "message": "Another process has locked the application manager."}),
	"E_INSTALL_APPLICATION_SERVICE_ALREADY_REGISTERED": new SpaceifyError({"code": 7008, "message": "Applications with same service names can not be installed at the same time."}),
	"E_GET_APPLICATIONS_FAILED_TO_GET_APPLICATIONS": new SpaceifyError({"code": 7009, "message": "Failed to list applications."}),
	"E_CREATE_CLIENT_CERTIFICATE_FAILED_TO_CREATE": new SpaceifyError({"code": 7010, "message": "Failed to create certificate for the application."}),
	"E_GIT_FAILED_TO_GET_GITHUB_DATA": new SpaceifyError({"code": 7011, "message": "Failed to get data from GitHub."}),
	"E_PROCESS_PACKAGE_FAILED": new SpaceifyError({"code": 7012, "message": "Getting package from ~source failed."}),
	"E_AUTHENTICATION_FAILED": new SpaceifyError({"code": 7013, "message": "Authentication failed."}),

	// Manager
	"E_START_INIT_FAILED": new SpaceifyError({"code": 8000, "message": "~type failed to initialize itself. ~err"}),
	"E_BUILD_READ_MANIFEST_FAILED": new SpaceifyError({"code": 8003, "message": "Unable to read/parse manifest of ~type ~unique_name."}),
	"E_RUN_FAILED_TO_RUN": new SpaceifyError({"code": 8004, "message": "Failed to run ~type ~unique_name."}),

	// WebServer
	"E_MOVED_PERMANENTLY": new SpaceifyError({"code": 301, "message": '<!DOCTYPE html><html><head><title>Redirection</title></head><body><h1>301 Moved Permanently</h1>The requested document is located in <a href="~location">here</a>.<h3>~serverName at ~hostname Port ~port</h3></body></html>'}),
	"E_MOVED_FOUND": new SpaceifyError({"code": 302, "message": '<!DOCTYPE html><html><head><title>Redirection</title></head><body><h1>302 Found</h1>The requested document is located in <a href="~location">here</a>.<h3>~serverName at ~hostname port ~port</h3></body></html>'}),

	"E_LISTEN_FATAL_ERROR": new SpaceifyError({"code": 10000, "message": "Fatal error in WebServer ~hostname:~port - ~err"}),

	"E_RENDER_OPERATION_PAGE_INVALID_DATA_POST": "{\"code\": 10001, \"message\": \"The submitted data is invalid.\", \"path\": \"WebServer::renderOperationPage()\"}",
	
	// SPM
	"E_SPM_UNKNOWN_COMMAND": new SpaceifyError({"code": 12001, "message": "Unknown command ~command."}),
	"E_SPM_CONNECTION_FAILED": new SpaceifyError({"code": 12002, "message": "Failed to connect to the Application manager."}),

	"E_SPM_ARGUMENTS_ONE": new SpaceifyError({"code": 12004, "message": "The ~command command must have one arguments: package."}),
	"E_SPM_ARGUMENTS_TWO": new SpaceifyError({"code": 12005, "message": "The ~command command must have one or two arguments: [authenticate] package."}),

	"E_SPM_REGISTER_FAILED": "Registering this edge node failed: ~message.",
	"I_SPM_REGISTER_SUCCESSFUL": "The registration information for this edge node is now created. The registration information is in file ~registration.",

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
	"E_DATABASE_GET_CORE_SETTINGS": new SpaceifyError({"code": 12009, "message": "Failed to get core settings."}),
	"E_DATABASE_SAVE_CORE_SETTINGS": new SpaceifyError({"code": 12010, "message": "Failed to update core settings."}),
	"E_DATABASE_GET_EDGE_SETTINGS": new SpaceifyError({"code": 12011, "message": "Failed to get edge settings."}),
	"E_DATABASE_SAVE_EDGE_SETTINGS": new SpaceifyError({"code": 12012, "message": "Failed to update edge settings."}),
	"E_DATABASE_GET_INFORMATION": new SpaceifyError({"code": 12013, "message": "Failed to get information."}),
	"E_DATABASE_ADMIN_LOGGED_IN": new SpaceifyError({"code": 12014, "message": "Failed to set admin log in."}),
	"E_DATABASE_ADD_PROVIDED_SERVICES": new SpaceifyError({"code": 12015, "message": "Failed to add provided services."}),
	"E_DATABASE_ADD_INJECT_HOSTNAMES": new SpaceifyError({"code": 12016, "message": "Failed to add inject hostnames."}),
	"E_DATABASE_ADD_INJECT_FILENAMES": new SpaceifyError({"code": 12017, "message": "Failed to add inject filenames."}),
	"E_DATABASE_CHECK_PROVIDED_SERVICES": new SpaceifyError({"code": 12018, "message": "Failed to check provided services."}),
	"E_DATABASE_GET_SERVICE": new SpaceifyError({"code": 12019, "message": "Failed to get service."}),
	"E_DATABASE_TEST": new SpaceifyError({"code": 12020, "message": "Failed to execute database test."}),

	// ValidatePackage
	"E_VALIDATE_PACKAGE_NO_APPLICATION_DIRECTORY": new SpaceifyError({"code": 13000, "message": "Package does not have application directory."}),
	"E_VALIDATE_PACKAGE_NO_MANIFEST_FILE": new SpaceifyError({"code": 13001, "message": "Package does not have manifest file."}),

	"E_VALIDATE_DIRECTORIES_INJECT_FILE": new SpaceifyError({"code": 13002, "message": "Inject file ~file is defined in the manifest but is not found in the applications www directory ~directory."}),
	"E_VALIDATE_DIRECTORIES_IMAGE_FILE": new SpaceifyError({"code": 13003, "message": "Image file ~file is defined in the manifest but is not found in the applications image directory ~directory."}),
	"E_VALIDATE_DIRECTORIES_IMAGE_TYPES": new SpaceifyError({"code": 13004, "message": "Supported image formats are jpg, gif and png."}),
	"E_VALIDATE_DIRECTORIES_DOCKER_IMAGE": new SpaceifyError({"code": 13005, "message": "Custom Docker image creation is defined but file Dockerfile is not found from applications directory."}),

	"E_VALIDATE_MANIFEST_MANIFEST_TYPE": new SpaceifyError({"code": 13006, "message": "Manifest must have type field defined and type must be spacelet, sandboxed or native."}),

	// WebOperation
	"E_GET_DATA_OPERATION_NOT_DEFINED": "{\"code\": 15000, \"message\": \"No operation defined.\", \"path\": \"WebOperation::getData()\"}",
	"E_GET_DATA_UNKNOWN_OPERATION": "{\"code\": 15001, \"message\": \"Undefined operation requested.\", \"path\": \"WebOperation::getData()\"}",
	"E_UNDEFINED_PARAMETERS": "{\"code\": 15002, \"message\": \"Required parameter(s) undefined.\", \"path\": \"WebOperation::getData()\"}",

	// SecurityModel
	"E_GET_SERVICE_UNREGISTERED": new SpaceifyError({"code": 16000, "message": "Get service failed because service ~name is not registered."}),
	"E_GET_SERVICE_FORBIDDEN": new SpaceifyError({"code": 16001, "message": "Get service failed because service ~name is forbidden to caller."}),
	"E_GET_SERVICE_APPLICATION_NOT_FOUND": new SpaceifyError({"code": 16002, "message": "Get service failed because application or spacelet was not found."}),
	"E_GET_SERVICE_APPLICATION_REQUIRES_SERVICES_NOT_DEFINED": new SpaceifyError({"code": 16003, "message": "Get service failed because application or spacelet ~unique_name does not have required services defined."}),
	"E_ADMIN_LOGIN_EDGE_SETTING": new SpaceifyError({"code": 16004, "message": "Failed to get edge settings."}),
	"E_ADMIN_LOG_IN_FAILED": new SpaceifyError({"code": 16005, "message": "Admin log in failed."}),
	"E_IS_LOCAL_SESSION_NON_EDGE_CALLER": new SpaceifyError({"code": 16006, "message": "Calls outside of the Spaceify edge are forbidden."}),

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
	"WEBSERVER_CONNECTING": "WebServer::connect() ~protocol://~hostname:~port",
	"WEBSERVER_CLOSING": "WebServer::close() ~protocol://~hostname:~port",

	// WebSocketConnection, WebSocketRpcConnection, WebSocketRpcServer, WebSocketServer
	"WEBSOCKET_OPENING": "~class::open() ~protocol://~hostname:~port/~subprotocol",
	"WEBSOCKET_CONNECTING": "~class::connect() to ~protocol://~hostname:~port/~subprotocol",
	"WEBSOCKET_CLOSING": "~class::close() server ~protocol://~hostname:~port/~subprotocol",
	"WEBSOCKET_CLOSING_WEB": "~class::close() web server ~protocol://~hostname:~port",
	"WEBSOCKET_CLOSE_CONNECTION": "~class::closeConnection() ~origin ~protocol://~hostname:~port/~subprotocol, id=~id",
	"WEBSOCKET_CONNECTION_REQUEST": "~class::connectionRequest() from ~origin ~protocol://~address:~port",
	"WEBSOCKET_SEND_MESSAGE": "~class::sendMessage() ~protocol://~hostname:~port/~subprotocol, id=~id, message=~message",
	"WEBSOCKET_SEND_BINARY": "~class::sendBinary() ~protocol://~hostname:~port/~subprotocol, id=~id, length=~length",
	"WEBSOCKET_NOTIFY_ALL": "~class::notifyAll() ~protocol://~hostname:~port/~subprotocol",
	"WEBSOCKET_ON_MESSAGE": "~class::onMessage() ~protocol://~hostname:~port/~subprotocol, id=~id, message=~message",

	// DockerHelper
	"EXECUTE_COMMAND": "Trying to execute command:\n~command\n",
	"EXECUTE_COMMAND_RECEIVED": "Received the end code '~code' from stdout.",

	// DockerImage
	"STOP_CONTAINER": "Stopping temporary container: ~container.",
	"REMOVE_CONTAINER": "Removing temporary container: ~container.",

	// ApplicationManager
	"RESOLVING_ORIGIN": "Resolving package origin...",
	"CHECKING_FROM": "Checking ~where",
	"PACKAGE_FOUND": "Package ~package found from ~where",
	"TRYING_TO_PUBLISH": "Trying to publish ~where",
	"APPLICATION_DIRECTORY": "application directory.",
	"LOCAL_DIRECTORY": "local directory.",
	"WORKING_DIRECTORY": "current working directory.",
	"LOCAL_ARCHIVE": "local Zip archive.",
	"WORKING_DIRECTORY_ARCHIVE": "Zip archive in the current working directory.",
	"GIT_REPOSITORY": "the GitHub repository.",
	"REMOTE_ARCHIVE": "remote Zip archive.",
	"SPACEIFY_REGISTRY": "the Spaceify registry.",
	"DOWNLOADING_GITUHB": "(~pos/~count) Downloading ~what (~bytes bytes)",

	"PACKAGE_POSTING": "Please wait, posting the package to the Spaceify registry.",
	"PACKAGE_POST_ERROR": "Failed to publish the package.",
	"PACKAGE_POST_OK": "Success. The package is now published.",
	"PACKAGE_REMOVED": "~type removed.",
	"PACKAGE_VALIDATING": "Validating package.",
	"PACKAGE_STOPPING": "Stopping ~type ~name.",
	"PACKAGE_STOPPING_EXISTING": "Stopping already installed ~type ~name.",
	"PACKAGE_STOPPED": "~type stopped.",
	"PACKAGE_REMOVING": "Removing ~type ~name:",
	"PACKAGE_STARTING": "Starting ~type ~name.",
	"PACKAGE_STARTED": "~type started.",
	"PACKAGE_RESTARTED": "~type restarted.",
	"PACKAGE_ALREADY_STOPPED": "~type ~name is already stopped.",
	"PACKAGE_ALREADY_RUNNING": "~type ~name is already running.",
	"PACKAGE_INSTALL_ERROR": "Failed to get the requested package.",
	"PACKAGE_REMOVE_FROM_DATABASE": " - Application entries from the database.",
	"PACKAGE_REMOVING_DOCKER": " - Docker image and container.",
	"PACKAGE_DELETE_FILES": " - Application files.",
	"PACKAGE_ASK_REQUIRED": "The ~type ~name requires the following service(s):",
	"PACKAGE_ASK_INSTALL_QUESTION": "Do you want to install the ~type?",
	"PACKAGE_ASK_INSTALL_Y_N": [{"screen": "Yes", "long": "yes", "short": "y"}, {"screen": "No", "long": "no", "short": "n"}],

	"INSTALL_APPLICATION": "Installing ~type ~name:",
	"INSTALL_APPLICATION_FILES": " - Copying files to volume.",
	"INSTALL_GENERATE_CERTIFICATE": " - Generating Spaceify CA signed certificate.",
	"INSTALL_CREATE_DOCKER_IMAGE": " - Creating custom Docker image ~image.",
	"INSTALL_CREATE_DOCKER": " - Creating Docker image from the default ~image image.",
	"INSTALL_UPDATE_DATABASE": " - Writing database entries.",
	"INSTALL_APPLICATION_OK": "~type ~name@~version is now installed.",
	"INSTALL_APPLICATION_ABORTED": "Installation aborted.",
	"INSTALL_APPLICATION_TIMED_OUT": "Installation timed out.",
	"INSTALL_VERSION_LATEST": "latest",
	"INSTALL_SUGGESTED": "Required service '~required_service_name' is not registered to the edge. Attempting to install the suggested package '~suggested_unique_name, version: ~suggested_version'.",
	"INSTALL_SUGGESTED_DIFFERENT_PACKAGES": "Required service '~required_service_name' is already registered by ~existing_type '~existing_unique_name, version: ~existing_version'. The suggested application '~suggested_unique_name, version: ~suggested_version' will not be installed. If the already installed ~existing_type is not suitable, remove it and install the suggested application manually.",
	"INSTALL_SUGGESTED_SAME_PACKAGES": "The installed ~installing_type requires '~suggested_unique_name, version: ~suggested_version' to be installed for the service '~required_service_name'. However, '~existing_unique_name, version: ~existing_version' is already installed and will not be reinstalled or updated.",
	
	"SERVICE_ALREADY_REGISTERED": "Service name ~service_name is already registered by application ~unique_name",

	"GET_SOURCES_OK": "Source codes are now loaded and are in the directory ~directory.",

	"EDGE_ALREADY_REGISTERED": "The registration file was found containing edge id ~edge_id. Previous registration is valid.",

	"CORE_SETTINGS_SAVED": "Core settings saved",
	"EDGE_SETTINGS_SAVED": "Edge settings saved",

	// SPM
	"AUTHENTICATION": "Enter user authentication for ~auth.",
	"USERNAME": "Username: ",
	"PASSWORD": "Password: ",

	"NO_APPLICATIONS": "No applications to list.",
	"NO_RUNNING_APPLICATIONS": "No running applications.",
	"INSTALLED_HEADERS": [ "Installed spacelets.", "Installed sandboxed applications.", "Installed native applications." ],
	"RUNNING_HEADERS": [ "Running spacelets.", "Running sandboxed applications.", "Running native applications." ],

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
	"M_IS_REGISTERED": "Is registered:",
	"M_TYPE": "Type:",
	"M_PORT": "Port:",
	"M_SECURE_PORT": "Secure port:",
	"M_IP": "IP:",

	"APP_DISPLAY_NAMES": {"spacelet": "spacelet", "sandboxed": "application", "native": "native application"},
	"APP_UPPER_CASE_DISPLAY_NAMES": {"spacelet": "Spacelet", "sandboxed": "Application", "native": "Native application"}
	};

if(typeof exports !== "undefined")
	module.exports = language;
