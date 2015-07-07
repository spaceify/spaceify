#!/bin/bash
# Spaceify Inc. 7.7.2015
# Database creation and maintenance

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
sqlite3 $dbs "UPDATE settings SET release_name='${release_name}', release_version='${release_version}', db_version='${db_version}';"
