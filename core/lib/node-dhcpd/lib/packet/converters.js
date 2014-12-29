/**
Static class to manage the collection of converters (encoder/decoder) found in 'packet/converters/'
The object signature for each converter must be:
{
	encode: function(buf, num, value, offset) { return offset; },
	decode: function(buf) { return null; }
}
*/
var utils = require('../utils');
var sprintf = require('../sprintf');

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// COMMON FUNCTIONS FOR OPTIONS //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var ed_ips = {
	encode: function(buf, num, data, offset)
		{
		buf[offset++] = num;
		buf[offset++] = data.length * 4;
		data.forEach(function(ip)
			{
			return ip.split(".").forEach(function(item)
				{
				buf[offset++] = item;
				});
			});
		return offset;
		},

	decode: function(buf)
		{
		var i = 0, numRecords = buf.length / 4, pos = 0, records = [];
		while(i < numRecords)
			{
			records.push(sprintf("%d.%d.%d.%d", buf[pos++], buf[pos++], buf[pos++], buf[pos++]));
			i++;
			}
		return records;
		}
	};

var ed_ip = {
	encode: utils.writeIp,
	decode: utils.readIp
	};

var ed_str = {
	encode: utils.writeString,
	decode: utils.readString
	};

var ed_int8 = {
	encode: function(buf, num, value, offset)
		{
		buf[offset++] = num;
		buf[offset++] = 1;
		utils.writeInt8(buf, value, offset);
		return offset + 1;
		},

	decode: function(buf)
		{
		return utils.readInt8(buf, 0);
		}
	};

var ed_int16 = {
	encode: function(buf, num, value, offset)
		{
		buf[offset++] = num;
		buf[offset++] = 2;
		utils.writeInt16(buf, value, offset);
		return offset + 2;
		},

	decode: function(buf)
		{
		return utils.readInt16(buf, 0);
		}
	};

var ed_int32 = {
	encode: function(buf, num, value, offset)
		{
		buf[offset++] = num;
		buf[offset++] = 4;
		utils.writeInt32(buf, value, offset);
		return offset + 4;
		},

	decode: function(buf)
		{
		return utils.readInt32(buf, 0);
		}
	};

var ed_int8a = {
	encode: function(buf, num, data, offset)
		{
		buf[offset++] = num;
		buf[offset++] = data.length;
		var i = 0;
		while(i < data.length)
			utils.writeInt8(buf, data[i++], offset++);
		return offset;
		},

	decode: function(buf)
		{
		var records = [], i = 0, len = buf.length;
		while(i < len)
			records[i] = buf[i++];
		return records;
		}
	};

var stub = {
	encode: function(buf, num, value, offset)
		{
		return offset;
		},

	decode: function(buf, num)
		{
		return null;
		}
	};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// CONVERTERS FOR OPTIONS ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var converters = {
	0: ed_int8,				// Pad
	19: ed_int8,			// IP Forwarding Enable/Disable
	20: ed_int8,			// Non-Local Source Routing Enable/Disable Option
	23: ed_int8,			// Default IP Time-to-live
	27: ed_int8,			// All Subnets are Local
	29: ed_int8,			// Perform Mask Discovery
	30: ed_int8,			// Mask Supplier
	31: ed_int8,			// Router discovery Enable/Disable
	34: ed_int8,			// Trailer Encapsulation
	36: ed_int8,			// Ethernet Encapsulation
	37: ed_int8,			// TCP Default TTL
	39: ed_int8,			// TCP Keepalive Garbage
	46: ed_int8,			// NetBIOS over TCP/IP Node Type
	52: ed_int8,			// Option Overload
	53: ed_int8,			// DHCP Message Type

	13:	ed_int16,			// Boot File Size
	22:	ed_int16,			// Maximum Datagram Reassembly Size
	26:	ed_int16,			// Interface MTU
	57:	ed_int16,			// Maximum message size

	2: ed_int32,			// Time offset
	24: ed_int32,			// Path MTU Aging Timeout Option
	35: ed_int32,			// ARP Cache Timeout
	38: ed_int32,			// TCP Keepalive Interva
	51: ed_int32,			// Lease time
	58: ed_int32,			// Renewal Time Value (T1)
	59: ed_int32,			// Rebinding Time Value (T2)

	1: ed_ip,				// Subnet mask
	16: ed_ip,				// Swap Server
	28: ed_ip,				// Broadcast address
	32: ed_ip,				// Router Solicitation Address
	50: ed_ip,				// Requested ip address
	54: ed_ip,				// DHCP Server identifier

	3: ed_ips,				// Routers
	4: ed_ips,				// Time Server
	5: ed_ips,				// Name Server
	6: ed_ips,				// DNS servers
	7: ed_ips,				// Log Server
	8: ed_ips,				// Cookie Server
	9: ed_ips,				// LPR Server
	10: ed_ips,				// Impress Server
	11: ed_ips,				// Resource Location Server
	21: ed_ips,				// Policy Filter Option
	33: ed_ips,				// Static routes
	41: ed_ips,				// Network Information Servers
	42: ed_ips,				// Network Time Protocol Servers
	44: ed_ips,				// NetBIOS name servers
	45: ed_ips,				// NetBIOS over TCP/IP Datagram Distribution Server
	48: ed_ips,				// X Window System Font Server
	49: ed_ips,				// X Window System Display Manager

	12: ed_str,				// Client hostname
	14: ed_str,				// Merit Dump File
	15: ed_str,				// DNS domain name
	17: ed_str,				// Root Path
	18: ed_str,				// Extensions Path
	40: ed_str,				// Network Information Service Domain
	47: ed_str,				// NetBIOS Scope ID
	56: ed_str,				// Message
	67: ed_str,				// Bootfile name

	55: ed_int8a,			// Parameter request list
	60: ed_int8a,			// Class-identifier

	25: {					// Path MTU Plateau Table Option
		encode: function(buf, num, value, offset)
			{
			buf[offset++] = num;
			buf[offset++] = data.length * 2;
			data.forEach(function(int16)
				{
				offset = utils.writeInt16(buf, int16, offset);
				});
			return offset;
			},

		decode: function(buf)
			{
			var i = 0, numRecords = buf.length / 2, records = [];
			while(i < numRecords)
				{
				buf[i++] = utils.readInt16(buf, offset);
				offset += 2;
				}
			return records;
			}
		},

	//?43:					// Vendor Specific Information

	61: {					// Client identifier
	encode: function(buf, num, value, offset)
		{
		return offset;
		},

	decode: function(buf)
		{
		var j = 1, s = [], type = buf[0];
		while(j < buf.length)
			s.push(sprintf("%02d", buf[j++]));
		return [type, s.join(":")];
		}
	},

	/*
	77: {					// User class information
	encode: utils.writeString,

	decode: function(buf)
		{
		var records = [], offset = 0;
		while(buf[offset])
			{
			var uc_len = buf[offset];
			var uc_data = buf.slice(offset++, uc_len);
			offset += uc_len;
			records.push(uc_data.toString('ascii'));
			}
		return records.join(':');
		}
	},

	81: {					// Client FQDN
	encode: function(buf, num, value, offset)
		{
		return offset;
		},

	decode: function(buf)
		{
		return sprintf("%d", buf[0]) + "-" + sprintf("%d", buf[1]) + "-" + sprintf("%d", buf[2]) + " " + utils.toString(buf.slice(3));
		}
	},

	119: {					// DNS search list
	encode: null,
	decode: null
	},
	*/

	// END OF THE LINE... SUCKA
	255: {
	encode: function(buf, num, value, offset)
		{
		utils.writeInt8(buf, 255, offset);
		return offset + 1;
		},

    decode: function(buf)
		{
		return undefined;
		}
	}

};

module.exports = function(i)
	{
	return (i in converters) ? converters[i] : stub;
	};
