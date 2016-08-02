#!/bin/bash
# Cleanup changes made by Spaceify before package is removed or installing package failed
# Spaceify Oy, 2015

printf "\n\e[42mRemoving Spaceify's installation\e[0m\n"

# ----------
# ----------
# ----------
# ----------
# ---------- DEBCONF ---------- #

#if [ "$1" = "purge" -a -e /usr/share/debconf/confmodule ]; then
#	. /usr/share/debconf/confmodule
#	db_purge
#fi

# ----------
# ----------
# ----------
# ----------
# ---------- Constants ---------- #

start_spaceify="# Added by Spaceify"
end_spaceify="# Added by Spaceify ends"
comm_out_spaceify="# Commented out by Spaceify: "

# ----------
# ----------
# ----------
# ----------
# ---------- Remove Spaceify's entries/comments from configuration files ---------- #

printf "\n\e[4mRestoring system configuration files and removing configuration files created by Spaceify.\e[0m\n"

	# - /etc/network/interfaces - #

sed -i -e "s/${comm_out_spaceify}//g" -e "/${start_spaceify}/,/${end_spaceify}/d" /etc/network/interfaces > /dev/null 2>&1 || true

	# - /etc/default/docker - #

sed -i "/${start_spaceify}/,/${end_spaceify}/d" /etc/default/docker > /dev/null 2>&1 || true

	# - /etc/rc.local - #

sed -i "/${start_spaceify}/,/${end_spaceify}/d" /etc/rc.local > /dev/null 2>&1 || true

	# - /etc/sysctl.conf - #

sed -i -e "s/${comm_out_spaceify}//g" -e "/${start_spaceify}/,/${end_spaceify}/d" /etc/sysctl.conf > /dev/null 2>&1 || true

	# - /etc/default/hostapd - #

sed -i -e "s/${comm_out_spaceify}//g" -e "/${start_spaceify}/,/${end_spaceify}/d" /etc/default/hostapd > /dev/null 2>&1 || true

	# - /etc/monit/monitrc - #

#sed -i "/${start_spaceify}/,/${end_spaceify}/d" /etc/monit/monitrc > /dev/null 2>&1 || true

	# - /etc/udhcpd.conf, /etc/default/udhcpd - #

rm /etc/udhcpd.conf > /dev/null 2>&1 || true
rm /etc/default/udhcpd > /dev/null 2>&1 || true

mv /etc/udhcpd.conf.original /etc/udhcpd.conf > /dev/null 2>&1 || true
mv /etc/default/udhcpd.original /etc/default/udhcpd > /dev/null 2>&1 || true

	# - DNS: /etc/resolvconf/resolv.conf.d/base, /etc/NetworkManager/NetworkManager.conf, /etc/dhcp/dhclient.conf - #
if [ -f /etc/NetworkManager/NetworkManager.conf ]; then
	sed -i -e "s/${comm_out_spaceify}//g" /etc/NetworkManager/NetworkManager.conf > /dev/null 2>&1 || true
fi

if [ -f /etc/dhcp/dhclient.conf ]; then
	sed -i -e "s/${comm_out_spaceify}//g" -e "/${start_spaceify}/,/${end_spaceify}/d" /etc/dhcp/dhclient.conf > /dev/null 2>&1 || true
fi

sed -i -e "s/${comm_out_spaceify}//g" -e "/${start_spaceify}/,/${end_spaceify}/d" /etc/resolvconf/resolv.conf.d/base > /dev/null 2>&1 || true

printf "\nOK\n"

# ----------
# ----------
# ----------
# ----------
# ---------- Remove Spaceify's files etc. ---------- #

eth=$(< /var/lib/spaceify/data/interfaces/ethernet)
appman_port=$(cat /var/lib/spaceify/code/www/libs/config.json | grep "APPMAN_PORT_SECURE" | sed 's/[^0-9]*//g') > /dev/null 2>&1 || true

printf "\n\e[4mStopping services.\e[0m\n"
service spaceifyhttp stop > /dev/null 2>&1 || true
service spaceifyappman stop > /dev/null 2>&1 || true
service spaceify stop > /dev/null 2>&1 || true
service spaceifyipt stop > /dev/null 2>&1 || true
service spaceifydns stop > /dev/null 2>&1 || true

printf "\nOK\n"

# ----------
# ----------
# ----------
# ----------
# ---------- Restore network ---------- #

printf "\n\e[4mTrying to restart network\e[0m\n"
if [[ -n $(service network-manager status |& grep unrecognized) ]]; then

	ifdown $eth > /dev/null 2>&1 || true
	ifup $eth > /dev/null 2>&1 || true

elif [[ -n $(service network-manager status |& grep running) ]]; then

	service network-manager restart > /dev/null 2>&1 || true

	resolvconf -u
fi

. /var/lib/spaceify/data/scripts/wait_network.sh 0 300 50 "Please wait, restarting the network."

printf "If the network did not restart, please do it manually.\n"

# ----------
# ----------
# ----------
# ----------
# ---------- Stop and remove docker container and images ---------- #
. /var/lib/spaceify/data/scripts/remove_images.sh

rm /var/lib/spaceify/data/docker/spaceifyubuntu* > /dev/null 2>&1 || true

printf "\nOK\n"

# ----------
# ----------
# ----------
# ----------
# ---------- Remove files ---------- #
if [ "$1" = "purge" ]; then

	printf "\n\e[4mRemoving files.\e[0m\n"

	rm /etc/init/spaceify.conf > /dev/null 2>&1 || true
	rm /etc/init/spaceifydns.conf > /dev/null 2>&1 || true
	rm /etc/init/spaceifyipt.conf > /dev/null 2>&1 || true
	rm /etc/init/spaceifyhttp.conf > /dev/null 2>&1 || true
	rm /etc/init/spaceifyappman.conf > /dev/null 2>&1 || true

	rm /etc/init.d/spaceify > /dev/null 2>&1 || true
	rm /etc/init.d/spaceifydns > /dev/null 2>&1 || true
	rm /etc/init.d/spaceifyipt > /dev/null 2>&1 || true
	rm /etc/init.d/spaceifyhttp > /dev/null 2>&1 || true
	rm /etc/init.d/spaceifyappman > /dev/null 2>&1 || true

	#find . -maxdepth 1 -type f -exec rm -f {} \; 2>&1 || true		# Files not directories
	#rm -r */														# Directories not files
	cd /var/lib/spaceify
	rm -r *

	printf "\nOK\n"

fi

# ----------
# ----------
# ----------
# ----------
# ---------- Remove spaceify's chains from iptables ---------- #

printf "\n\e[4mRemoving iptables chains\e[0m\n"

sed -i "/${start_spaceify}/,/${end_spaceify}/d" /etc/rc.local

	# - Mangle chain - #
#/sbin/iptables -t mangle -D PREROUTING -j Spaceify-mangle > /dev/null 2>&1 || true
#/sbin/iptables -t mangle -F Spaceify-mangle > /dev/null 2>&1 || true
#/sbin/iptables -t mangle -X Spaceify-mangle > /dev/null 2>&1 || true
#/sbin/iptables -t nat -D PREROUTING -m mark --mark 99 -p tcp --dport 80 -j DNAT --to-destination 10.0.0.1 > /dev/null 2>&1 || true
#/sbin/iptables -t nat -D PREROUTING -m mark --mark 99 -p tcp --dport 443 -j DNAT --to-destination 10.0.0.1 > /dev/null 2>&1 || true
#/sbin/iptables -t filter -D FORWARD -m mark --mark 99 -j DROP > /dev/null 2>&1 || true

	# - HTTP filter chain, NAT chain and redirect chain - #
/sbin/iptables -t nat -D PREROUTING -j Spaceify-HTTP-Nat-Redir > /dev/null 2>&1 || true
/sbin/iptables -t nat -D POSTROUTING -j Spaceify-HTTP-Nat-Masq > /dev/null 2>&1 || true
/sbin/iptables -t nat -F Spaceify-HTTP-Nat-Masq > /dev/null 2>&1 || true
/sbin/iptables -t nat -X Spaceify-HTTP-Nat-Masq > /dev/null 2>&1 || true
/sbin/iptables -t nat -F Spaceify-HTTP-Nat-Redir > /dev/null 2>&1 || true
/sbin/iptables -t nat -X Spaceify-HTTP-Nat-Redir > /dev/null 2>&1 || true

	# - HTTPS filter chain, NAT chain and redirect chain - #
/sbin/iptables -t nat -D PREROUTING -j Spaceify-HTTPS-Nat-Redir > /dev/null 2>&1 || true
/sbin/iptables -t nat -D POSTROUTING -j Spaceify-HTTPS-Nat-Masq > /dev/null 2>&1 || true
/sbin/iptables -t nat -F Spaceify-HTTPS-Nat-Masq > /dev/null 2>&1 || true
/sbin/iptables -t nat -X Spaceify-HTTPS-Nat-Masq > /dev/null 2>&1 || true
/sbin/iptables -t nat -F Spaceify-HTTPS-Nat-Redir > /dev/null 2>&1 || true
/sbin/iptables -t nat -X Spaceify-HTTPS-Nat-Redir > /dev/null 2>&1 || true

	# - Docker container connection chains - #
iptables-save | grep -v -- '-j Spaceify-Nat-Connections' | iptables-restore
/sbin/iptables -t nat -F Spaceify-Nat-Connections > /dev/null 2>&1 || true
/sbin/iptables -t nat -X Spaceify-Nat-Connections > /dev/null 2>&1 || true
/sbin/iptables -t nat -D POSTROUTING -s 172\.17\.0\.0\/16 ! -o docker0 -j MASQUERADE > /dev/null 2>&1 || true

/sbin/iptables -t filter -D FORWARD -j Spaceify-Filter-Connections > /dev/null 2>&1 || true
/sbin/iptables -t filter -F Spaceify-Filter-Connections > /dev/null 2>&1 || true
/sbin/iptables -t filter -X Spaceify-Filter-Connections > /dev/null 2>&1 || true

	# - Application Manager rules - #
#/sbin/iptables -D INPUT -p tcp -s localhost --dport $appman_port -j ACCEPT > /dev/null 2>&1 || true
#/sbin/iptables -D INPUT -p tcp --dport $appman_port -j DROP > /dev/null 2>&1 || true

printf "\nOK\n\n"
