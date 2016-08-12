#!/bin/bash
# Process input gathered during install process. Debconf was locked in postinst and spawned scripts
# were not allowed to use it. This phase was therefore separated to its own script.
# Spaceify Oy 6.7.2015

# ----- Get input: source debconf/confmodule ----- #
. /usr/share/debconf/confmodule

#
db_get spaceify/ethernet
eth="$RET"

#
db_get spaceify/wlan
wlan="$RET"

#
db_get spaceify/wlan_ap
is_internal="$RET"
if [[ "$is_internal" == "Internal" ]]; then
	is_internal="1"
else
	is_internal="0"
fi

#
db_get spaceify/edge_name
edge_name="$RET"

#
db_get spaceify/admin_password
admin_password="$RET"
admin_salt=$(openssl rand -hex 64)
admin_password=$(echo -n "${admin_password}${admin_salt}" | openssl dgst -sha512 -hex | awk '{print $2}')
db_set spaceify/admin_password ""

#
db_purge

db_stop

# ----- Write input to separate files ----- #
mkdir -p /var/lib/spaceify/data/interfaces/ > /dev/null 2>&1 || true
mkdir -p /var/lib/spaceify/data/db/ > /dev/null 2>&1 || true
#chmod -R 0755 /var/lib/spaceify/data/interfaces/ > /dev/null 2>&1 || true
#chmod -R 0755 /var/lib/spaceify/data/db/ > /dev/null 2>&1 || true

printf "$eth" > /var/lib/spaceify/data/interfaces/ethernet
printf "$wlan" > /var/lib/spaceify/data/interfaces/wlan
printf "$is_internal" > /var/lib/spaceify/data/interfaces/is_internal

printf "$edge_name" > /var/lib/spaceify/data/db/edge_name

printf "$admin_salt" > /var/lib/spaceify/data/db/admin_salt
printf "$admin_password" > /var/lib/spaceify/data/db/admin_password
