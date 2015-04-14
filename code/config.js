module.exports = function()
	{
	var edge_hostname = "edge.spaceify.net";
	var edge_hostname_regx = "edge\\.spaceify\\.net";
	var registry_hostname = "spaceify.org";

	/*var dirname = __dirname;
	if(dirname.search(/\/api$/) != -1)
		dirname = require("path").join(dirname, "../");
	dirname = dirname.replace(/\/$/, "");*/

	var spaceify_path = "/var/lib/spaceify/";
	var spaceify_code_path = "/var/lib/spaceify/code/";
	var spaceify_data_path = "/var/lib/spaceify/data/";

	var config = 
	{
	"SPACEIFY_PATH": spaceify_path,
	"SPACEIFY_CODE_PATH": spaceify_code_path,
	"SPACEIFY_DATA_PATH": spaceify_data_path,
	"SPACEIFY_WWW_PATH": spaceify_code_path + "www/",
	"SPACEIFY_TLS_PATH": spaceify_data_path + "tls/",
	"SPACEIFY_DATABASE_FILE": spaceify_data_path + "db/spaceify.db",
	"SPACEIFY_MANIFEST_FILE": spaceify_data_path + "manifest/manifest.rules",

	"SPACELETS_PATH": spaceify_data_path + "spacelets/",
	"SANDBOXED_PATH": spaceify_data_path + "sandboxed/",
	"NATIVE_PATH": spaceify_data_path + "native/",

	"DOCS_PATH": spaceify_data_path + "docs/",

	"VOLUME_DIRECTORY": "volume/",
	"VOLUME_PATH": "/volume/",
	"API_PATH": "/api/",
	"API_WWW_PATH": "/api/www/",
	"API_NODE_MODULES_DIRECTORY": "/api/node_modules",
	"APPLICATION": "application",
	"APPLICATION_DIRECTORY": "application/",
	"APPLICATION_PATH": "/volume/application/",
	"APPLICATION_TLS_PATH": "/volume/tls/",
	"APPLICATION_WWW_PATH": "/volume/application/www/",

	"WWW_URL": edge_hostname + "/",
	"WWW_DIRECTORY": "www/",

	"WORK_PATH": "/tmp/packet/",
	"SOURCES_DIRECTORY": "sources/",

	"TEMPLATES_PATH": spaceify_code_path + "www/templates/",
	"LANGUAGES_PATH": spaceify_code_path + "www/languages/",

	"LEASES_PATH": spaceify_data_path + "dhcp-data",
	"IPTABLES_PATH": spaceify_data_path + "ipt-data",
	"IPTABLES_PIPER": spaceify_data_path + "dev/iptpiper",
	"IPTABLES_PIPEW": spaceify_data_path + "dev/iptpipew",

	"TLS_DIRECTORY": "tls/",
	"TLS_PATH": "/tls/",
	"TLS_SQUID_PATH": "/etc/squid3/certs/",

	"SPACEIFY_DOCKER_IMAGE": "spaceifyubuntu",

	// REMEMBER TO CHANGE THESE IN www/engigine.io.js AND www/spaceifyclient.js!!!
	"EDGE_IP": "10.0.0.1",
	"EDGE_SUBNET": "10.0.0.0/24",
	"EDGE_IP_RANGE_START":  "10.0.0.2",
	"EDGE_IP_RANGE_END":  "10.0.0.254",
	"EDGE_DHCP_LEASE_TIME":  3600,
	"EDGE_NETMASK": { decimal: "255.255.255.0", binary: 4294967040 },
	"EDGE_NETWORK": { decimal: "10.0.0.0", binary: 167772160 },
	"EDGE_HOSTNAME": edge_hostname,
	"EDGE_HOSTNAME_REGX": edge_hostname_regx,
	"EDGE_PORT_HTTP": 80,//58080
	"EDGE_PORT_HTTPS": 443,//58443
	"CORE_PORT_WEBSOCKET": 2947,
	"CORE_PORT_WEBSOCKET_SECURE": 4947,
	"CORE_PORT_SOCKET": 2948,
	"CORE_PORT_SOCKET_SECURE": 4948,
	"APPMAN_PORT_WEBSOCKET": 2949,
	"APPMAN_PORT_WEBSOCKET_SECURE": 4949,
	"SPM_PORT_WEBSOCKET": 2950,
	"SPM_PORT_WEBSOCKET_SECURE": 4950,

	"REGISTRY_HOSTNAME": registry_hostname,
	"REGISTRY_PUBLISH_URL": "http://" + registry_hostname + "/ajax/upload.php?type=package&id=package", // ToDo: real url!!! "https://" + registry_hostname + "/upload.php?type=package&id=package",
	"REGISTRY_INSTALL_URL": "http://" + registry_hostname + "/install.php", // ToDo: real url!!! "https://" + registry_hostname + "/install.php",

	"GITHUB_HOSTNAME": "github.com",

	"DNS_PORT": 53,

	"MACREGX": new RegExp("^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$", "i"),
	"IP_REGX": new RegExp("\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b"),

	/*
	 * PACKAGE/APPLICATION CONSTANTS
	 */
	"JAVASCRIPT": "javascript",
	"CSS": "css",
	"FILE": "file",
	"INJECT_TYPES": ["javascript", "css", "file"],

	"UTF8": "utf",
	"ASCII": "ascii",
	"BASE64": "base64",

	"SPACELET": "spacelet",
	"SANDBOXED": "sandboxed",
	"NATIVE": "native",
	"ANY": "any",
	"SHORT_APPLICATION_TYPES": {spacelet: "spacelet", sandboxed: "sandboxed", native: "native"},

	"OPEN": "open",
	"OPEN_LOCAL": "open_local",
	"STANDARD": "standard",
	"SERVICE_TYPES": ["open", "open_local", "standard"],
	"HTTP_SERVICE": "http",
	"HTTPS_SERVICE": "https",

	"EXT_ZIP": ".zip",
	"PACKAGE_DELIMITER": "@",

	"MANIFEST": "spaceify.manifest",
	"READMEMD": "readme.md",
	"PACKAGEZIP": "package.zip",
	"PUBLISHZIP": "publish.zip",
	"SPMERRORSJSON": "spm_errors.json",
	"SPMHELP": "spm.help",
	"DOCKERFILE": "Dockerfile",
	"MANIFESTRULES": "manifest.rules",
	"VERSIONS": "versions",

	"ENGINEIOJS": "engine.io.js",
	"SPACEIFYCLIENTJS": "spaceifyclient.js",
	"INDEX_FILE": "index.html",
	"SERVER_NAME": "Spaceify Web Server",
	
	"TILEFILE": "tile.html",
	"WEB_SERVER": "WEB_SERVER",

	"CUSTOM": "custom_",

	"CLIENT_READY": "client application ready",

	"IMAGE_DIRECTORY": "www/images/",
	"IMAGE_TYPES": ["image/jpg", "image/gif", "image/png"],

	"FIRST_SERVICE_PORT": 2777,
	"FIRST_SERVICE_PORT_SECURE": 3777,
	"SERVER_CRT": "server.crt",
	"SERVER_KEY": "server.key",
	"SPACEIFY_CRT": "spaceify.crt"
	}

	return config;
	};
