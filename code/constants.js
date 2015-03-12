var constants =
	{
	"CORE_VERSION": "0.1.0",
	"SPM_VERSION": "0.1.0",

	"JAVASCRIPT": "javascript",
	"CSS": "css",
	"FILE": "file",
	"INJECT_TYPES": ["javascript", "css", "file"],
	// +++
	"UTF8": "utf",
	"ASCII": "ascii",
	"BASE64": "base64",
	// +++
	"SPACELET": "spacelet",
	"SANDBOXED_APPLICATION": "sandboxed_application",
	"NATIVE_APPLICATION": "native_application",
	"ANY": "any",
	"SHORT_APPLICATION_TYPES": {spacelet: "spacelet", sandboxed: "sandboxed_application", native: "native_application"},
	// +++
	"OPEN_LOCAL": "open_local",
	"STANDARD": "standard",
	"SERVICE_TYPE_HTTP": "http",											// For the internal
	"SERVICE_TYPE_HTTPS": "https",											// www servers,
	"SERVICE_TYPES": ["open_local", "standard"],
	"CLIENT_HTTP_SERVER": "client_http_server",								// don't list these 
	"CLIENT_HTTPS_SERVER": "client_https_server",							// in the SERVICE_TYPES above!!!

	"EXT_ZIP": ".zip",
	"PACKAGE_DELIMITER": "@",

	// +++
	"MANIFEST": "spaceify.manifest",
	"READMEMD": "readme.md",
	"PACKAGEZIP": "package.zip",
	"PUBLISHZIP": "publish.zip",
	"SPMERRORSJSON": "spm_errors.json",
	"DOCKERFILE": "Dockerfile",
	"ENGINEIOJS": "engine.io.js",
	"SPACEIFYCLIENTJS": "spaceifyclient.js",
	"INDEX_FILE": "index.html",

	"TILEFILE": "tile.html",
	"WEB_SERVER": "WEB_SERVER",

	"CUSTOM": "custom_",

	"CLIENT_READY": "client application ready",

	"SERVER_NAME": "Spaceify Web Server",

	"FIRST_SERVICE_PORT": 2777,
	"FIRST_SERVICE_PORT_SECURE": 3777,
	"SERVER_CRT": "server.crt",
	"SERVER_KEY": "server.key",
	"SPACEIFY_CRT": "spaceify.crt"
	}

module.exports = constants;
