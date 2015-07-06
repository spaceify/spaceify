#!/bin/bash
# Get DNS server IP address for Spaceify's DNS server, 30.4.2015 Spaceify Inc.

eth=$(</var/lib/spaceify/data/interfaces/ethernet)

lease=""																					# Get the leases for the user selected network adapter connected to the internet
find="option domain-name-servers "
if [ -s "/var/lib/dhcp/dhclient.${eth}.leases" ]; then										# Try different locations (FILE exists and has a size greater than zero)
	lease="/var/lib/dhcp/dhclient.${eth}.leases"
elif [ -s /var/lib/dhcp/dhclient.leases ]; then
	lease="/var/lib/dhcp/dhclient.leases"
elif [ -s "/var/lib/dhcp3/dhclient.${eth}.leases"  ]; then
	lease="/var/lib/dhcp3/dhclient.${eth}.leases"
elif [ -s /var/lib/dhcp3/dhclient.leases ]; then
	lease="/var/lib/dhcp3/dhclient.leases"
else
	find="nameserver"
	lease="/etc/resolv.conf"
fi

ips=$(grep "$find" "$lease" | tail -1)														# Find last occurance = latest lease

ips=${ips//$find/}																		# Replace
ips=${ips//;/,}
ips=${ips// /}

IFS="," read -a ips <<< "$ips"															# Split into an array of IPs

dip=""
for ip in "${ips[@]}"; do
	ip=${ip//,/}

	if [[ "$ip" != "127.0.0.1" && "$ip" != "10.0.0.1" ]]; then
		dip=$ip
		break;
	fi
done

mkdir -p /var/lib/spaceify/data/dns > /dev/null 2>&1 || true								# Save the IP to Spaceify's directory for its DNS server to find

if [ ! -z "$dip" ]; then																		# IP was found
	printf $dip > /var/lib/spaceify/data/dns/ip
else																							# Use Google's server if IP wasn't found
	printf "8.8.8.8" > /var/lib/spaceify/data/dns/ip
fi
