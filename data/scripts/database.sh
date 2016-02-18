#!/bin/bash
# Spaceify Inc. 7.7.2015
# Database creation and maintenance

#printf "\e[4mDatabase management\e[0m\n\n"

# ----- Create Spaceify's database ----- #

mkdir /var/lib/spaceify/data/db/ > /dev/null 2>&1 || true									# create directory for the database
cd /var/lib/spaceify/data/db

dbs="/var/lib/spaceify/data/db/spaceify.db"

if [ ! -e $dbs ]; then																		# create a new database
	touch $dbs
	sqlite3 $dbs < /var/lib/spaceify/data/db/create.sql
fi

chmod 0764 spaceify.db > /dev/null 2>&1 || true											# spm must be able to write to the database

# ----- Set release name and version and database version ----- #
versions=$(< /var/lib/spaceify/versions)
release_version=$(echo $versions | awk -F : '{print $2}')
release_name=$(echo $versions | awk -F : '{print $3}')
db_version=$(echo $versions | awk -F : '{print $7}')

current_version=$(sqlite3 $dbs "SELECT db_version FROM settings;")

sqlite3 $dbs "UPDATE settings SET release_name='${release_name}', release_version='${release_version}', db_version='${db_version}';"

# ----- (Re)create user table row ----- #
if [ -e /tmp/edge_id.uuid ]; then
	eid=$(</tmp/edge_id.uuid)
elif [ -e /var/lib/spaceify/data/db/edge_id.uuid ]; then										# Find existing registration
	eid=$(</var/lib/spaceify/data/db/edge_id.uuid)
else
	eid=","
fi
OIFS="$IFS"; IFS="," read -ra auuid <<< "$eid"; IFS="$OIFS"
eid="${auuid[0]}"
epw="${auuid[1]}"

as=$(< /var/lib/spaceify/data/db/admin_salt) > /dev/null 2>&1 || true
ah=$(< /var/lib/spaceify/data/db/admin_hash) > /dev/null 2>&1 || true
rm /var/lib/spaceify/data/db/admin_salt > /dev/null 2>&1 || true
rm /var/lib/spaceify/data/db/admin_hash > /dev/null 2>&1 || true

ac=$(sqlite3 $dbs "SELECT admin_login_count FROM user LIMIT 1;")
al=$(sqlite3 $dbs "SELECT admin_last_login FROM user LIMIT 1;")
if [ "$ac" == "" ]; then ac=0; fi
if [ "$al" == "" ]; then al=0; fi

sqlite3 $dbs "DELETE FROM user;"

sqlite3 $dbs "INSERT INTO user (admin_password_hash, admin_salt, edge_id, edge_password, admin_login_count, admin_last_login) VALUES('$ah', '$as', '$eid', '$epw', $ac, $al);"

# -----Changes between database versions ----- #
if (( $current_version < 6 )); then															# add position column
	sqlite3 $dbs "ALTER TABLE applications ADD COLUMN position INTEGER DEFAULT 0;"
fi
