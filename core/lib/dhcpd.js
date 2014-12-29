var dhcp_server = require("./node-dhcpd");
var netmask = require("netmask").Netmask;
var ee = require("events").EventEmitter;
var util = require("util");
var clone = require("clone");
var async = require("async");

var requests = {};
function _clean_request(mac_addr)
	{
	if(requests[mac_addr])
		{
		if(requests[mac_addr].offer && requests[mac_addr].offer.timeout_id)
			{
			clearTimeout(requests[mac_addr].offer.timeout_id);
			}
		requests[mac_addr] = null;
		delete requests[mac_addr];
		}
	}

const
	BOOTREQUEST       = 1,
	DHCP_MESSAGE_TYPE = 53,
	DHCP_SERVER_ID    = 54,
	DHCP_DISCOVER     = 1,
	DHCP_INFORM       = 8,
	DHCP_MINTYPE      = DHCP_DISCOVER,
	DHCP_MAXTYPE      = DHCP_INFORM,
	DHCP_REQUESTED_IP = 50,
	DHCP_HOST_NAME    = 12;

function dhcpd(opts)
	{
	var self = this;
	if(!(self instanceof dhcpd))
		{
		return new dhcpd(opts);
		}
	ee.call(self);

	if(opts.subnet)
		{
		var block = new netmask(opts.subnet);
		if(block)
			{
			self.subnet_range	= opts.range_start + "-" + opts.range_end;
			self.start_end		= self.subnet_range.split("-");
			self.network		= block.base;
			self.netmask		= block.mask;
			self.broadcast		= block.broadcast;

			self.routers		= opts.routers || [];
			self.dnsservers		= opts.dnsservers || [];
			self.lease_time		= opts.lease_time || 3600;
			self.siaddr			= opts.siaddr;
			self.giaddr			= opts.giaddr;
			self.domain_name	= self.domain_name || "";
			}
		else
			{
			throw new Error("Unable to grok network details from " + opts.subnet);
			}
		}

		self.server = new dhcp_server("udp4", { broadcast: self.broadcast });
		self.server.on("listening", function()
			{
			var address = self.server.address();
			console.log("server listening ------> " + address.address + ":" + address.port);
			});

		self.server.on("discover", self.discover.bind(self));
		self.server.on("request", self.request.bind(self));
		self.server.on("decline", self.decline.bind(self));
		self.server.on("release", self.release.bind(self));

		self.save_lease       = opts.save_lease;
		self.get_lease        = opts.get_lease;
		self.get_lease_by_ip  = opts.get_lease_by_ip;
		self.get_next_ip      = opts.get_next_ip;
		self.remove_lease     = opts.remove_lease;

		self.server.bind(67, "0.0.0.0", function()
			{
			self.server.setMulticastTTL(255);
			self.server.addMembership("239.255.255.249", self.siaddr);
			//self.server.setMulticastLoopback(true);
			});

		return self;
	}
	util.inherits(dhcpd, ee);

function _get_option(pkt, opt)
	{
	return (opt in pkt.options) ? pkt.options[opt] : undefined;
	}

dhcpd.prototype.pre_init = function pre_init(pkt, cb)
	{
	var self = this;

	if(pkt.hlen != 6) return;											// Ignore packet

	if(pkt.op != BOOTREQUEST) return;									// Ignore if this isn't a BOOTREQUEST

	var state = _get_option(pkt, DHCP_MESSAGE_TYPE);
	if(state == undefined || state[0] < DHCP_MINTYPE || state[0] > DHCP_MAXTYPE) return;

	// Get SERVER_ID if present
	var server_id_opt = _get_option(pkt, DHCP_SERVER_ID);
	if(server_id_opt && server_id_opt != self.siaddr)
		return;

	// Look for a static/dynamic lease
	self.get_lease(pkt.chaddr, function(lease)
		{
		// Get REQUESTED_IP if present
		var requested_ip = _get_option(pkt, DHCP_REQUESTED_IP);
		return cb(lease, requested_ip);
		});
	}

dhcpd.prototype.discover = function discover(pkt)
	{
	console.log("GOT DISCOVER");

	var self = this;
	var offer = {};
	offer.siaddr = self.siaddr;
	offer.giaddr = self.giaddr;
	offer.options = self.makeOptions(clone(pkt.options));

	async.waterfall(
	[
		function($cb)
			{
			self.pre_init(pkt, function(lease, requested_ip)
				{
				return $cb(null, lease, requested_ip);
				});
			},

		function(lease, requested_ip, $cb)
			{
			if(lease)
				{
				console.log("Using pre-existing lease's offer", lease);
				offer = lease.offer;
				return $cb(null);
				}

			console.log("Creating a new lease");
			if(requested_ip && !self.get_lease_by_ip(requested_ip))										// An IP has been requested as part of the discover and isn't in use
				{
				if(requested_ip && (ip2long(self.start_end[0]) <= ip2long(requested_ip) <= ip2long(self.start_end[1])) )	// Supplied IP is within our range
					{
					console.log("Using ip requested by client");
					offer.yiaddr = requested_ip;
					return $cb(null);
					}
				else																					// Supplied IP is not within our range
					{
					console.log("Client requested invalid IP");
					return self.server.nak(pkt);
					}
				}
			else
				{ // We need to get a new IP
				console.log("Getting a new IP");
				self.get_next_ip(function(new_ip)
					{
					if(new_ip)																			// We have a new IP to offer
						{
						console.log("Using new IP of: " + new_ip);
						offer.yiaddr = new_ip;
						return $cb(null);
						}
					else																				// We don't have a new IP to offer =0(
						{
						console.log("Unable to find IP for use, ignoring");
						return;
						}
					});
				}
			}
		],

		function(err, result)
			{ // Set a short-term record so we can match against XID, lets forget about this request after 60 seconds
			if(!requests[pkt.chaddr])
				{
				requests[pkt.chaddr] = 
					{
					xid: pkt.xid,
					chaddr: pkt.chaddr,
					offer: offer,
					when: new Date(),
					timeout_id: setTimeout(function() { _clean_request(pkt.chaddr);	}, 60 * 1000)
					};
				}

			console.log("Making an offer for mac: " + pkt.chaddr + " > ip: " + offer.yiaddr);
			return self.server.offer(pkt, offer);
		});
	};

dhcpd.prototype.request = function request(pkt)
	{
	console.log("GOT REQUEST");

	var self = this;
	var cur_request = requests[pkt.chaddr];
	self.pre_init(pkt, function(lease, requested_ip)
		{
		// We're serving a request based on a DISCOVER, if we'll receive a request from a client which sent a discover before.
		if(cur_request)
			{
			if(cur_request.xid && cur_request.xid !== pkt.xid)											// If the xid does not match, discard the offer we sent
				{
				_clean_request(pkt.chaddr);
				return self.server.nak(pkt);
				}

			if(cur_request.offer)																		// We have a valid offer, save it
				{
				console.log("Received valid request from " + pkt.chaddr + " for ip " + cur_request.offer.yiaddr);
				var offer = clone(cur_request.offer);
				self.save_lease({yiaddr: cur_request.offer.yiaddr, offer: offer, chaddr: pkt.chaddr}, function()
					{
					console.log("DONE");
					_clean_request(pkt.chaddr);

					return self.server.ack(pkt, offer);
					});
				}
			}
		// We're serving a request from a client that either didn't run DISCOVER or has come back from reboot in INIT-REBOOT phase
		// OR we're getting a request due to the client going into RENEW
		// OR we're getting a request from the client because it's lease is about to expire
		else
			{
			console.log("ATTEMPTING TO GET A LEASE FOR:  " + pkt.chaddr);

			if(lease)																					// Lease exists, update it
				{
				console.log("Got an existing lease for " + pkt.chaddr);
				self.save_lease({chaddr: pkt.chaddr, yiaddr: lease.yiaddr, offer: clone(lease.offer)}, function()
					{
					pkt.siaddr = self.siaddr;
					pkt.giaddr = self.giaddr;
					pkt.options = self.makeOptions(pkt.options);

					return self.server.ack(pkt);
					});
				}
			else
				{
				console.log("Didn't find existing lease for " + pkt.chaddr);
				return self.server.nak(pkt);
				}
			}
		});
	};

dhcpd.prototype.decline = function decline(pkt)
	{
	var cur_request = requests[pkt.chaddr];
	if(cur_request && cur_request.offer)
		{
		self.remove_lease(pkt.chaddr, function()
			{
			_clean_request(pkt.chaddr);
			});
		}
	return;
	};

dhcpd.prototype.release = function release(pkt)
	{
	var cur_request = requests[pkt.chaddr];
	// We shouldn't really get into a position where we've got a request without a lease, but lets double check
	if(cur_request && cur_request.offer)
		{
		_clean_request(pkt.chaddr);
		}
	self.remove_lease(pkt.chaddr, function(){});
	};

dhcpd.prototype.inform = function inform(pkt)
	{
	// not currently supporting INFORM, so ignore
	return;
	};

dhcpd.prototype.makeOptions = function(options)
	{
	var self = this;

	// Offer these options always
	roptions = {};
	roptions["1"] = self.netmask;
	roptions["3"] = self.routers;
	roptions["6"] = self.dnsservers;
	roptions["12"] = self.domain_name;
	roptions["15"] = self.domain_name;
	roptions["28"] = self.broadcast;
	roptions["51"] = self.lease_time;
	roptions["54"] = self.siaddr;
	roptions["58"] = Math.round(self.lease_time * 0.5);
	roptions["59"] = Math.round(self.lease_time * 0.875);
	roptions["255"] = null;

	/* Options send by client to server
	case 50: 	// Requested ip address
	case 53:	// DHCP Message type, don't set this here, because it is set in server.js
	case 55:	// Parameter request list*/

	// Add client requested options
	if(options["55"])
		{
		for(op=0; op<options.length; op++)
			{
			switch(options[op])
				{
				case 1:													// Subnet mask
					roptions[op] = self.netmask;
					break;
				case 2:													// Time offset, time offset from UTC time of the server
					var d = new Date();
					roptions[op] = d.getTimezoneOffset() * 60;	
					break;
				case 3:													// Routers
					roptions[op] = self.routers;
					break;
				case 4:													// Time Server
					break;
				case 5:													// Name Server
					break;
				case 6:													// DNS nameservers
					roptions[op] = self.dnsservers;
					break;
				case 7:													// Log Server
					break;
				case 8:													// Cookie Server
					break;
				case 9:													// LPR Server (line printer)
					break;
				case 10:												// Impress Server (Imagen Impress)
					break;
				case 11:												// Resource Location Server
					break;
				case 13:												// Boot File Size
					break;
				case 14:												// Merit Dump File
					break;
				case 15:												// DNS domain name - This option specifies the domain name that client should use when resolving hostnames via DNS.
					roptions[op] = self.domain_name;
					break;
				case 16:												// Swap Server
					break;
				case 17:												// Root Path
					break;
				case 18:												// Extensions Path
					break;
				case 19:												// IP Forwarding Enable/Disable
					roptions[op] = 0;
					break;
				case 20:												// Non-Local Source Routing Enable/Disable
					roptions[op] = 0;
					break;
				case 21:												// Policy Filter
					break;
				case 22:												// Maximum Datagram Reassembly Size
					break;
				case 23:												// Default IP Time-to-live
					break;
				case 24:												// Path MTU Aging Timeout?
					break;
				case 25:												// Path MTU Plateau Table?
					break;
				case 26:												// Interface MTU
					break;
				case 27:												// All Subnets are Local
					roptions[op] = 1;
					break;
				case 28:												// Broadcast address
					roptions[op] = self.broadcast;
				case 29:												// Perform Mask Discovery
					roptions[op] = 0;
					break;
				case 30:												// Mask Supplier
					roptions[op] = 0;
					break;
				case 31:												// Perform Router Discovery
					roptions[op] = 0;
					break;
				case 32:												// Router Solicitation Address
					break;
				case 33:												// Static routes
					break;
				case 34:												// Trailer Encapsulation
					roptions[op] = 0;
					break;
				case 35:												// ARP Cache Timeout
					break;
				case 36:												// Ethernet Encapsulation
					//roptions[op] = 0 or 1?;
					break;
				case 37:												// TCP Default TTL
					break;
				case 38:												// TCP Keepalive Interval
					break;
				case 39:												// TCP Keepalive Garbage
					//roptions[op] = 0;
					break;
				case 40:												// Network Information Service Domain
					break;
				case 41:												// Network Information Servers
					break;
				case 42:												// Network Time Protocol Servers
					break;
				case 43:												// Vendor Specific Information
					break;
				case 44:												// NetBIOS name servers
					break;
				case 45:												// NetBIOS over TCP/IP Datagram Distribution Server
					break;
				case 46: 												// NetBIOS node type
					break;
				case 47:												// NetBIOS Scope ID
					break;
				case 48:												// X Window System Font Server
					break;
				case 49:												// X Window System Display Manager
					break;
				case 51:												// Lease time
					break;
				case 52:												// Option Overload
					break;
				case 54: 												// DHCP Server identifier
					roptions[op] = self.siaddr;
					break;
				case 56:												// Message (error message)
					break;
				case 57:												// Maximum message size
					break;
				case 58:												// Renewal Time Value (T1)
					roptions[op] = Math.round(self.lease_time * 0.5);
					break;
				case 59:												// Rebinding Time Value (T2)
					roptions[op] = Math.round(self.lease_time * 0.875);
					break;
				case 60:												// Class-identifier
					break;
				case 61:												// Client identifier
					break;
				//case 62:													// NetWare/IP Domain
				//case 63:													// NetWare/IP Option
				//case 64:													// NIS+ Domain Name 
				//case 65:													// NIS+ Servers
				//case 66:													// TFTP Server Name
				//case 67:													// Bootfile name, TFTP server is not implemented and the Boot file field in DHCP message packet is not used to carry additional DHCP options
				//case 68:													// Mobile IP Home Agents
				//case 69:													// Simple Mail Transport Protocol (SMTP) Server 
				//case 70:													// Post Office Protocol (POP3) Server 
				//case 71:													// Network News Transport Protocol (NNTP) Server 
				//case 72:													// Default World Wide Web Server 
				//case 73:													// Default Finger Server 
				//case 74:													// Default Internet Relay Chat Server 
				//case 75:													// StreetTalk Server
				//case 76:													// StreetTalk Directory Assistance Server 
				//case 77:													// User class information
				//case 78:													// Directory Agent
				//case 79:													// Service Scope
				//case 80:													// Rapid Commit
				//case 81:													// Client FQDN
				//case 82:													// Relay Agent Information
				//case 83:													// iSNS
				//case 84:													// REMOVED/Unassigned
				//case 85:													// NDS Servers
				//case 86:													// NDS Tree Name
				//case 87:													// NDS Context
				//case 88:													// BCMCS Controller Domain Name list
				//case 89:													// BCMCS Controller IPv4 address option
				//case 90:													// Authentication
				//case 91:													// client-last-transaction-time option
				//case 92:													// associated-ip option
				//case 93:													// Client System
				//case 94:													// Client NDI
				//case 95:													// LDAP
				//case 96:													// REMOVED/Unassigned
				//case 97:													// UUID/GUID
				//case 98:													// User-Auth
				//case 99:													// GEOCONF_CIVIC
				//case 100:													// PCode
				//case 101:													// TCode
				//case 102-107:												// REMOVED/Unassigned
				//case 108:													// REMOVED/Unassigned
				//case 109:													// Unassigned
				//case 110:													// REMOVED/Unassigned
				//case 111:													// Unassigned
				//case 112:													// Netinfo Address
				//case 113:													// Netinfo Tag
				//case 114:													// URL
				//case 115:													// REMOVED/Unassigned
				//case 116:													// Auto-Config
				//case 117:													// Name Service Search
				//case 118:													// Subnet Selection Option
				//case 119:													// Domain Search
				//case 120:													// SIP Servers DHCP Option
				//case 121:													// Classless Static Route Option
				//case 122:													// CCC
				//case 123:													// GeoConf Option
				//case 124:													// V-I Vendor Class
				//case 125:													// V-I Vendor-Specific Information
				//case 126:													// Removed/Unassigned
				//case 127:													// Removed/Unassigned
				//case 128:													// PXE - undefined (vendor specific)
				//case 128:													// Etherboot signature. 6 bytes: E4:45:74:68:00:00
				//case 128:													// DOCSIS "full security" server IP address
				//case 128:													// TFTP Server IP address (for IP Phone software load)
				//case 129:													// PXE - undefined (vendor specific)
				//case 129:													// Kernel options. Variable length string
				//case 129:													// Call Server IP addres
				//case 130:													// PXE - undefined (vendor specific)
				//case 130:													// Ethernet interface. Variable length string.
				//case 130:													// Discrimination string (to identify vendor)
				//case 131:													// PXE - undefined (vendor specific)
				//case 131:													// Remote statistics server IP address
				//case 132:													// PXE - undefined (vendor specific)
				//case 132:													// IEEE 802.1Q VLAN ID
				//case 133:													// PXE - undefined (vendor specific)
				//case 133:													// IEEE 802.1D/p Layer 2 Priority
				//case 134:													// PXE - undefined (vendor specific)
				//case 134:													// Diffserv Code Point (DSCP) for VoIP signalling and media streams
				//case 135:													// PXE - undefined (vendor specific)
				//case 135:													// HTTP Proxy for phone-specific applications
				//case 136:													// OPTION_PANA_AGENT
				//case 137:													// OPTION_V4_LOST
				//case 138:													// OPTION_CAPWAP_AC_V4
				//case 139:													// OPTION-IPv4_Address-MoS
				//case 140:													// OPTION-IPv4_FQDN-MoS
				//case 141:													// SIP UA Configuration Service Domains
				//case 142:													// OPTION-IPv4_Address-ANDSF
				//case 143:													// Unassigned
				//case 144:													// GeoLoc
				//case 145:													// FORCERENEW_NONCE_CAPABLE
				//case 146:													// RDNSS Selection
				//case 147-149:												// Unassigned
				//case 150:													// TFTP server address
				//case 150:													// Etherboot
				//case 150:													// GRUB configuration path name
				//case 151:													// status-code
				//case 152:													// base-time
				//case 153:													// start-time-of-state
				//case 154:													// query-start-time
				//case 155:													// query-end-time
				//case 156:													// dhcp-state
				//case 157:													// data-source
				//case 158:													// OPTION_V4_PCP_SERVER
				//case 159-174:												// Unassigned
				//case 175:													// Etherboot (Tentatively Assigned - 2005-06-23)
				//case 176:													// IP Telephone (Tentatively Assigned - 2005-06-23)
				//case 177:													// Etherboot (Tentatively Assigned - 2005-06-23)
				//case 177:													// PacketCable and CableHome (replaced by 122)
				//case 178-207:												// Unassigned
				//case 208:													// PXELINUX Magic
				//case 209:													// Configuration File
				//case 210:													// Path Prefix
				//case 211:													// Reboot Time
				//case 212:													// OPTION_6RD
				//case 213:													// OPTION_V4_ACCESS_DOMAIN
				//case 214-219:												// Unassigned
				//case 220:													// Subnet Allocation Option
				//case 221:													// Virtual Subnet Selection (VSS) Option
				//case 222-223:												// Unassigned
				//case 224-254:												// Reserved (Private Use)
				//case 255:													// End
				}	
			}
		}

	return roptions;
	};

function ip2long(ip_address)
	{
	var parts = ip_address.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
	return parts.length == 5 ?
		parseInt(+parts[1],10) * 16777216 + parseInt(+parts[2],10) * 65536 + parseInt(+parts[3],10) * 256 + parseInt(+parts[4],10) * 1
		: false;
	};

module.exports = dhcpd;
