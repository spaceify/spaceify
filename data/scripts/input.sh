#!/bin/bash
# Spaceify Inc. 6.7.2015
# Process input gathered during install process. Debconf was locked in postinst and spawned scripts 
# were not allowed to use it. This phase was therefore separated to its own scripts.

# ----- Get input: source debconf/confmodule ----- #
. /usr/share/debconf/confmodule

db_get spaceify/ethernet
eth="$RET"

db_get spaceify/wlan
wlan="$RET"

db_get spaceify/wlan_ap
is_internal="$RET"
if [[ "$is_internal" == "Internal" ]]; then
	is_internal="1"
else
	is_internal="0"
fi

db_get spaceify/admin_password
admin_password="$RET"
db_set spaceify/admin_password ".N.A."

db_stop

# ----- Write input to separate files ----- #
mkdir /var/lib/spaceify/data/interfaces/ > /dev/null 2>&1 || true

printf "$eth" > /var/lib/spaceify/data/interfaces/ethernet
printf "$wlan" > /var/lib/spaceify/data/interfaces/wlan
printf "$is_internal" > /var/lib/spaceify/data/interfaces/is_internal

# ----- Update the created/restored admin password to the database ----- #
if [[ "$admin_password" != ".N.A." ]]; then
	edge_id=$(sqlite3 /var/lib/spaceify/data/db/spaceify.db "SELECT edge_id FROM user")

	admin_salt=$(openssl rand -hex 64)
	admin_password_hash=$(echo -n "${admin_password}${admin_salt}" | openssl dgst -sha512 -hex | awk '{print $2}')
	sqlite3 /var/lib/spaceify/data/db/spaceify.db "INSERT OR REPLACE INTO user (admin_password_hash, admin_salt, edge_id)  VALUES('${admin_password_hash}', '${admin_salt}', '${edge_id}');"
fi
