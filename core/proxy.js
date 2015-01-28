var http = require("http");

var http = require("http");
var https = require("https");
var Netmask = require('netmask').Netmask
var Config = require("./config")();

var block = new Netmask(Config.EDGE_SUBNET);

http.createServer(function(request, response)
	{
	var statusCode = null;
	var path = request.url;
	var host = request.headers["host"];
	var IP = request.connection.remoteAddress;

	var isRemoteIP = (block.contains(IP) ? true : false);

	try { var dhcpRedirect = true;													// Show splash if MAC is not in the accepted list
		  if(lease = dhcpserver.getDHCPLeaseByIP(IP)) dhcpRedirect = !iptables.hasSplashMAC(lease.mac_or_duid); } catch(err) {}

isRemoteIP = true;
	if(host != Config.EDGE_HOSTNAME && dhcpRedirect && isRemoteIP)					// Redirect to splash (index) screen, if MAC not in DHCP leases and request from remote IP
		{
console.log(host, "OK");
		path = "";
		host = Config.EDGE_HOSTNAME;
		statusCode = 302;
		}

console.log(host, path, IP, isRemoteIP);

	var request_options = { host: host, port: 80, path: path, method: request.method };

	var proxy_request = http.request(request_options, function(proxy_response)
		{
		if(statusCode)
			response.statusCode = 302;
		proxy_response.pipe(response);
		proxy_response.on("data", function(chunk)
			{
			});
		response.writeHead(proxy_response.statusCode, proxy_response.headers)
		});

	request.pipe(proxy_request);
	}).listen(8888, null, 511);