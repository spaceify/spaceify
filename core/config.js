module.exports = function()
	{
	var dirname = __dirname;
	var edge_hostname = "edge.spaceify.net";
	var edge_hostname_regx = "edge\\.spaceify\\.net";
	var registry_hostname = "spaceify.org";

	if(dirname.search(/\/api$/) != -1)
		dirname = require("path").join(dirname, "../");
	dirname = dirname.replace(/\/$/, "");

	var config = 
	{
	"ROOT_PATH": dirname + "/",
	"SPACELETS_PATH": dirname + "/spacelets/",
	"SANDBOXEDAPPS_PATH": dirname + "/sandboxedapps/",
	"NATIVEAPPS_PATH": dirname + "/nativeapps/",

	"VOLUME_DIRECTORY": "volume/",
	"VOLUME_PATH": "/volume/",
	"APPLICATION": "application",
	"APPLICATION_DIRECTORY": "application/",
	"APPLICATION_PATH": "/volume/application/",

	"WWW_URL": edge_hostname + "/",
	"WWW_DIRECTORY": "www/",
	"WWW_PATH": dirname + "/www/",

	"WORK_PATH": "/tmp/packet/",

	"LOCAL_TEMPLATE_PATH": dirname + "/www/templates/",
	"LOCAL_LANGUAGE_PATH": dirname + "/www/languages/",

	"SPACEIFY_DATABASE_FILEPATH": "/var/lib/spaceify/db/spaceify.db",

	"API_DIRECTORY": "api/",

	"LEASES_PATH": "/var/lib/spaceify/dhcp-data",
	"IPTABLES_PATH": "/var/lib/spaceify/ipt-data",
	"IPTABLES_PIPER": "/var/lib/spaceify/dev/iptpiper",
	"IPTABLES_PIPEW": "/var/lib/spaceify/dev/iptpipew",

	"CA_CERT_PATH": dirname + "/www/spaceifyCA.crt",
	"SSL_KEY_LEN": "4096",
	"SSL_DIRECTORY": "ssl/",
	"SSL_PATH": dirname + "/ssl/",
	"SSL_SPACEIFY_KEY": "spaceify.key",
	"SSL_SPACEIFY_CERT": "spaceify.crt",
	"SSL_CLIENT_CONF": "openssl_client.conf",
	"SSL_SQUID_PATH": "/etc/squid3/certs/",
	"SSL_SQUID_CA_PATH": "/etc/squid3/certs/spaceifyCA/",
	"SSL_CA_KEY": "spaceifyCA.key",
	"SSL_CA_CERT": "spaceifyCA.crt",

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

	"DNS_PORT": 53,

	"MACREGX": new RegExp("^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$", "i"),
	"IPREGX": new RegExp("\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b")
	}

	return config;
	};
