#!/bin/bash
# Spaceify Inc. 7.7.2015
# Database creation and maintenance

# ----- Set initial positions ----- #
position ()
{
	pos=1
	unique_names=$(sqlite3 $2 "SELECT unique_name FROM applications WHERE type='$1';")
	while read -r unique_name; do
		sqlite3 $2 "UPDATE applications SET position=$pos WHERE unique_name='$unique_name';"
		((pos++))
	done <<< "$unique_names"
}

# ----- Create Spaceify's database ----- #

mkdir /var/lib/spaceify/data/db/ > /dev/null 2>&1 || true									# create directory for the database
cd /var/lib/spaceify/data/db

dbs="/var/lib/spaceify/data/db/spaceify.db"

if [ ! -e $dbs ]; then																		# create a new database
	touch $dbs
	sqlite3 $dbs < /var/lib/spaceify/data/db/create.sql
fi

	# -- set release name and version and database version --#
versions=$(< /var/lib/spaceify/versions)
release_version=$(echo $versions | awk -F : '{print $2}')
release_name=$(echo $versions | awk -F : '{print $3}')
db_version=$(echo $versions | awk -F : '{print $7}')

current_version=$(sqlite3 $dbs "SELECT db_version FROM settings;")

sqlite3 $dbs "UPDATE settings SET release_name='${release_name}', release_version='${release_version}', db_version='${db_version}';"

chmod 0764 data/db/spaceify.db > /dev/null 2>&1 || true										# spm must be able to write to the database

# ----- Changes between database versions ----- #
if (( $current_version < 6 )); then															# add position column and set initial positions
	sqlite3 $dbs "ALTER TABLE applications ADD COLUMN position INTEGER DEFAULT 0;"

	position "spacelet" $dbs
	position "sandboxed" $dbs
	position "native" $dbs
fi
