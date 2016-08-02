#!/bin/bash
# Database creation and maintenance
# Spaceify Oy 7.7.2015

#printf "\e[4mDatabase management\e[0m\n\n"

# ----- Create Spaceify's database ----- #

mkdir /var/lib/spaceify/data/db/ > /dev/null 2>&1 || true								# create directory for the database
cd /var/lib/spaceify/data/db

dbs="/var/lib/spaceify/data/db/spaceify.db"
dbc="/var/lib/spaceify/data/db/create.sql"

if [ ! -e $dbs ]; then																	# create a new database
	touch $dbs
	sqlite3 $dbs < $dbc
fi

chmod 0764 spaceify.db > /dev/null 2>&1 || true											# spm must be able to write to the database

# Set release name, release version and database version // // // // // // // // // //
versions=$(< /var/lib/spaceify/versions)
release_version=$(echo $versions | awk -F : '{print $2}')
release_name=$(echo $versions | awk -F : '{print $3}')
db_version=$(echo $versions | awk -F : '{print $7}')

	# ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! !
	# Store previous version (canonical form). This is for updating edge below 0.5.0 to 0.5.0 or above. Remove this after couple of updates.
previous_version=$(sqlite3 $dbs "SELECT release_version FROM information;" || false)
if [[ $? != 0 ]]; then previous_version=$(sqlite3 $dbs "SELECT release_version FROM settings;" || false); fi
IFS='.' read -r -a previous_version <<< $previous_version
printf -v previous_version "%05d.%05d.%05d" ${previous_version[0]} ${previous_version[1]} ${previous_version[2]}
printf $previous_version > /var/lib/spaceify/data/db/previous_edge_version
	# See debian/postinst to see how this is used.
	# ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! !

current_version=$(sqlite3 $dbs "SELECT db_version FROM information;" || false)
if [[ $? != 0 ]]; then																	# Settings contain version if information doesn't exist yet
	current_version=$(sqlite3 $dbs "SELECT db_version FROM settings;" || false)
else
	sqlite3 $dbs "UPDATE information SET release_name='${release_name}', release_version='${release_version}', db_version='${db_version}';"
fi

# (Re)create user table row // // // // // // // // // //
if [ -e /tmp/edge_id.uuid ]; then
	eid=$(</tmp/edge_id.uuid)
elif [ -e /var/lib/spaceify/data/db/edge_id.uuid ]; then								# Find existing registration
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
if [[ $current_version < 6 ]]; then
	sqlite3 $dbs "ALTER TABLE applications ADD COLUMN position INTEGER DEFAULT 0;"
fi

if [[ $current_version < 7 ]]; then
	# CHANGE LANGUAGE FIELD TO LOCALE FIELD AND SESSION_TTL TO LOG_IN_SESSION_TTL
	# REMOVE DB_VERSION, RELEASE_NAME AND RELEASE_VERSION FIELDS
	values=$(sqlite3 $dbs "SELECT * FROM settings;")									# Get existing values from the database
	values=$(node /var/lib/spaceify/code/lib/installhelper.js "dbSettingsValuesForV6" "$values")

	IFS=";" read -a sql <<< $(< $dbc)													# Get the "CREATE TABLE settings(..." row from the create script
	createTable="${sql[ $((${#sql[@]}-2)) ]}"

	fields=$(echo $createTable | awk -F "[()]" '{ print $2 }')							# Get the new field names from the table
	fields=$(node /var/lib/spaceify/code/lib/installhelper.js "dbSettingsFieldsForV6" "$fields")

	sqlite3 $dbs "DROP TABLE settings; $createTable;"									# Drop the old settings table and create the new table
	sqlite3 $dbs "INSERT INTO settings $fields VALUES $values;"							# Fill the table with the existing values

	# CREATE INFORMATION TABLE
	IFS=";" read -a sql <<< $(< $dbc)													# Get the "CREATE TABLE information(..." row from the create script	
	createTable="${sql[ $((${#sql[@]}-4)) ]}"

	insertValues="INSERT INTO information VALUES('$db_version', '$release_name', '$release_version')"	# Insert the latest values

	sqlite3 $dbs "$createTable; $insertValues;"											# Create
fi
