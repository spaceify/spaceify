#!/bin/bash

###########
# DEBCONF #
###########

if [ "$1" = "purge" -a -e /usr/share/debconf/confmodule ]; then
	. /usr/share/debconf/confmodule
	db_purge
fi

echo PURGE | debconf-communicate spaceify > /dev/null 2>&1 || true

#############
# CONSTANTS #
#############

start_spaceify="# Added by Spaceify"
end_spaceify="# Added by Spaceify ends"
comm_out_spaceify="# Commented out by Spaceify: "

###############################################################
# REMOVE SPACEIFY'S ENTRIES/COMMENTS FROM CONFIGURATION FILES #
###############################################################

# ----- /etc/network/interfaces ----- #

sed -i -e "s/${comm_out_spaceify}//g" -e "/${start_spaceify}/,/${end_spaceify}/d" /etc/network/interfaces > /dev/null 2>&1 || true

# ----- /etc/default/docker ----- #

sed -i "/${start_spaceify}/,/${end_spaceify}/d" /etc/default/docker > /dev/null 2>&1 || true

# ----- /etc/rc.local ----- #

sed -i "/${start_spaceify}/,/${end_spaceify}/d" /etc/rc.local > /dev/null 2>&1 || true

# ----- /etc/sysctl.conf ----- #

sed -i -e "s/${comm_out_spaceify}//g" -e "/${start_spaceify}/,/${end_spaceify}/d" /etc/sysctl.conf > /dev/null 2>&1 || true

# ----- /etc/default/hostapd ----- #

sed -i -e "s/${comm_out_spaceify}//g" -e "/${start_spaceify}/,/${end_spaceify}/d" /etc/default/hostapd > /dev/null 2>&1 || true

# ----- /etc/monit/monitrc ----- #

#sed -i "/${start_spaceify}/,/${end_spaceify}/d" /etc/monit/monitrc > /dev/null 2>&1 || true

# ----- /etc/udhcpd.conf, /etc/default/udhcpd ----- #

rm /etc/udhcpd.conf > /dev/null 2>&1 || true
rm /etc/default/udhcpd > /dev/null 2>&1 || true

mv /etc/udhcpd.conf.original /etc/udhcpd.conf > /dev/null 2>&1 || true
mv /etc/default/udhcpd.original /etc/default/udhcpd > /dev/null 2>&1 || true

# DNS
# ----- /etc/resolvconf/resolv.conf.d/base, /etc/NetworkManager/NetworkManager.conf, /etc/dhcp/dhclient.conf ----- #
if [ -f /etc/NetworkManager/NetworkManager.conf ]; then
	sed -i -e "s/${comm_out_spaceify}//g" /etc/NetworkManager/NetworkManager.conf > /dev/null 2>&1 || true
fi

if [ -f /etc/dhcp/dhclient.conf ]; then
	sed -i -e "s/${comm_out_spaceify}//g" -e "/${start_spaceify}/,/${end_spaceify}/d" /etc/dhcp/dhclient.conf > /dev/null 2>&1 || true
fi

sed -i -e "s/${comm_out_spaceify}//g" -e "/${start_spaceify}/,/${end_spaceify}/d" /etc/resolvconf/resolv.conf.d/base > /dev/null 2>&1 || true

###########################
# REMOVE SPACEIFY'S FILES #
###########################

service spaceify stop > /dev/null 2>&1 || true												# stop core first
service spaceifyipt stop > /dev/null 2>&1 || true
service spaceifydns stop > /dev/null 2>&1 || true

if [[ -n $(service network-manager status |& grep unrecognized) ]]; then					# try to restore DNS
	resolvconf -u
elif [[ -n $(service network-manager status |& grep running) ]]; then
	service network-manager restart
fi

if [ "$1" = "remove" ]; then																# clean up
	rm /etc/init/spaceify.conf > /dev/null 2>&1 || true
	rm /etc/init/spaceifydns.conf > /dev/null 2>&1 || true
	rm /etc/init/spaceifyipt.conf > /dev/null 2>&1 || true

	rm /etc/init.d/spaceify > /dev/null 2>&1 || true
	rm /etc/init.d/spaceifydns > /dev/null 2>&1 || true
	rm /etc/init.d/spaceifyipt > /dev/null 2>&1 || true

	rm -r /var/lib/spaceify/code > /dev/null 2>&1 || true
	rm -r /var/lib/spaceify/dev/iptpiper > /dev/null 2>&1 || true
	rm -r /var/lib/spaceify/dev/iptpipew > /dev/null 2>&1 || true

	. /var/lib/spaceify/data/scripts/remove_images.sh										# Stop and remove all containers and images

	printf "\n\nSpaceify's data stored in directory /var/lib/spaceify/data is not removed. Remove it by hand if necessary.\n\n"
fi

##########################################
# REMOVE SPACEIFY'S CHAINS FROM IPTABLES #
##########################################

iptables -t mangle -D PREROUTING -j Spaceify-mangle > /dev/null 2>&1 || true
iptables -t mangle -F Spaceify-mangle > /dev/null 2>&1 || true
iptables -t mangle -X Spaceify-mangle > /dev/null 2>&1 || true
iptables -t nat -D PREROUTING -m mark --mark 99 -p tcp --dport 80 -j DNAT --to-destination 10.0.0.1 > /dev/null 2>&1 || true
iptables -t nat -D PREROUTING -m mark --mark 99 -p tcp --dport 443 -j DNAT --to-destination 10.0.0.1 > /dev/null 2>&1 || true
iptables -t filter -D FORWARD -m mark --mark 99 -j DROP > /dev/null 2>&1 || true

iptables -t nat -D PREROUTING -j Spaceify-HTTP-Nat-Redir > /dev/null 2>&1 || true
iptables -t nat -D POSTROUTING -j Spaceify-HTTP-Nat-Masq > /dev/null 2>&1 || true
iptables -t nat -F Spaceify-HTTP-Nat-Masq > /dev/null 2>&1 || true
iptables -t nat -X Spaceify-HTTP-Nat-Masq > /dev/null 2>&1 || true
iptables -t nat -F Spaceify-HTTP-Nat-Redir > /dev/null 2>&1 || true
iptables -t nat -X Spaceify-HTTP-Nat-Redir > /dev/null 2>&1 || true

iptables -t nat -D PREROUTING -j Spaceify-HTTPS-Nat-Redir > /dev/null 2>&1 || true
iptables -t nat -D POSTROUTING -j Spaceify-HTTPS-Nat-Masq > /dev/null 2>&1 || true
iptables -t nat -F Spaceify-HTTPS-Nat-Masq > /dev/null 2>&1 || true
iptables -t nat -X Spaceify-HTTPS-Nat-Masq > /dev/null 2>&1 || true
iptables -t nat -F Spaceify-HTTPS-Nat-Redir > /dev/null 2>&1 || true
iptables -t nat -X Spaceify-HTTPS-Nat-Redir > /dev/null 2>&1 || true
