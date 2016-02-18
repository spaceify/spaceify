#!/bin/bash

printf "\n\e[4mRemoving Spaceify's installation\e[0m\n"

# ----- DEBCONF ----- #

if [ "$1" = "purge" -a -e /usr/share/debconf/confmodule ]; then
	. /usr/share/debconf/confmodule
	db_purge
fi

echo PURGE | debconf-communicate spaceify > /dev/null 2>&1 || true

# ----- CONSTANTS ----- #

start_spaceify="# Added by Spaceify"
end_spaceify="# Added by Spaceify ends"
comm_out_spaceify="# Commented out by Spaceify: "

# ----- REMOVE SPACEIFY'S ENTRIES/COMMENTS FROM CONFIGURATION FILES ----- #

printf "\nRestoring system configuration files and removing configuration files created by Spaceify.\n"

	# -- /etc/network/interfaces -- #

sed -i -e "s/${comm_out_spaceify}//g" -e "/${start_spaceify}/,/${end_spaceify}/d" /etc/network/interfaces > /dev/null 2>&1 || true

	# -- /etc/default/docker -- #

sed -i "/${start_spaceify}/,/${end_spaceify}/d" /etc/default/docker > /dev/null 2>&1 || true

	# -- /etc/rc.local -- #

sed -i "/${start_spaceify}/,/${end_spaceify}/d" /etc/rc.local > /dev/null 2>&1 || true

	# -- /etc/sysctl.conf -- #

sed -i -e "s/${comm_out_spaceify}//g" -e "/${start_spaceify}/,/${end_spaceify}/d" /etc/sysctl.conf > /dev/null 2>&1 || true

	# -- /etc/default/hostapd -- #

sed -i -e "s/${comm_out_spaceify}//g" -e "/${start_spaceify}/,/${end_spaceify}/d" /etc/default/hostapd > /dev/null 2>&1 || true

	# -- /etc/monit/monitrc -- #

#sed -i "/${start_spaceify}/,/${end_spaceify}/d" /etc/monit/monitrc > /dev/null 2>&1 || true

	# -- /etc/udhcpd.conf, /etc/default/udhcpd -- #

rm /etc/udhcpd.conf > /dev/null 2>&1 || true
rm /etc/default/udhcpd > /dev/null 2>&1 || true

mv /etc/udhcpd.conf.original /etc/udhcpd.conf > /dev/null 2>&1 || true
mv /etc/default/udhcpd.original /etc/default/udhcpd > /dev/null 2>&1 || true

	# -- DNS: /etc/resolvconf/resolv.conf.d/base, /etc/NetworkManager/NetworkManager.conf, /etc/dhcp/dhclient.conf -- #
if [ -f /etc/NetworkManager/NetworkManager.conf ]; then
	sed -i -e "s/${comm_out_spaceify}//g" /etc/NetworkManager/NetworkManager.conf > /dev/null 2>&1 || true
fi

if [ -f /etc/dhcp/dhclient.conf ]; then
	sed -i -e "s/${comm_out_spaceify}//g" -e "/${start_spaceify}/,/${end_spaceify}/d" /etc/dhcp/dhclient.conf > /dev/null 2>&1 || true
fi

sed -i -e "s/${comm_out_spaceify}//g" -e "/${start_spaceify}/,/${end_spaceify}/d" /etc/resolvconf/resolv.conf.d/base > /dev/null 2>&1 || true

# ----- REMOVE SPACEIFY'S FILES ----- #

printf "\nStopping services.\n"
service spaceifyhttp stop > /dev/null 2>&1 || true											# stop core first
service spaceifyappman stop > /dev/null 2>&1 || true
service spaceify stop > /dev/null 2>&1 || true
service spaceifyipt stop > /dev/null 2>&1 || true
service spaceifydns stop > /dev/null 2>&1 || true

printf "\nRestoring network. Restart networking manually if necessary.\n"
if [[ -n $(service network-manager status |& grep unrecognized) ]]; then					# try to restore DNS
	resolvconf -u
elif [[ -n $(service network-manager status |& grep running) ]]; then
	service network-manager restart

	resolvconf -u
fi

printf "\nRemoving files.\n"
rm /etc/init/spaceify.conf > /dev/null 2>&1 || true											# Remove files
rm /etc/init/spaceifydns.conf > /dev/null 2>&1 || true
rm /etc/init/spaceifyipt.conf > /dev/null 2>&1 || true
rm /etc/init/spaceifyhttp.conf > /dev/null 2>&1 || true
rm /etc/init/spaceifyappman.conf > /dev/null 2>&1 || true

rm /etc/init.d/spaceify > /dev/null 2>&1 || true
rm /etc/init.d/spaceifydns > /dev/null 2>&1 || true
rm /etc/init.d/spaceifyipt > /dev/null 2>&1 || true
rm /etc/init.d/spaceifyhttp > /dev/null 2>&1 || true
rm /etc/init.d/spaceifyappman > /dev/null 2>&1 || true

cd /var/lib/spaceify
#rm -r code/ > /dev/null 2>&1 || true
#find . -maxdepth 1 -type f -exec rm -f {} \; 2>&1 || true
rm -r code/node_modules/ > /dev/null 2>&1 || true
rm data/dev/iptpiper > /dev/null 2>&1 || true
rm data/dev/iptpipew > /dev/null 2>&1 || true

#if [ "$1" = "purge" ]; then
#	rm -r data/spacelets > /dev/null 2>&1 || true
#	rm -r data/sandboxed > /dev/null 2>&1 || true
#	rm -r data/native > /dev/null 2>&1 || true
#	rm -r data/installed > /dev/null 2>&1 || true
#	rm -r data/scripts > /dev/null 2>&1 || true
#	rm -r data/db > /dev/null 2>&1 || true
#	rm -r data/docker > /dev/null 2>&1 || true
	#rm -r /usr/bin > /dev/null 2>&1 || true
	#rm -r /usr/bin > /dev/null 2>&1 || true
	#rm -r /usr/bin > /dev/null 2>&1 || true
	#rm -r /etc/bash_completion.d > /dev/null 2>&1 || true
#fi

# ----- Stop and remove Docker container and images ----- #
. /var/lib/spaceify/data/scripts/remove_images.sh

# ----- Clean the database ----- #
printf "\n\e[4mCleaning database\e[0m\n"

sqlite3 $dbs "DELETE FROM applications;" > /dev/null 2>&1
sqlite3 $dbs "DELETE FROM provided_services;" > /dev/null 2>&1
sqlite3 $dbs "DELETE FROM inject_hostnames;" > /dev/null 2>&1
sqlite3 $dbs "DELETE FROM inject_files;" > /dev/null 2>&1

printf "\nOK\n"

# ----- REMOVE SPACEIFY'S CHAINS FROM IPTABLES ----- #

printf "\n\e[4mRemoving iptables chains\e[0m\n"

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

printf "\nOK\n\n"
