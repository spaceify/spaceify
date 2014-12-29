#!/bin/bash
# The spaceify.db contains the tables and other necessary data for Spaceify to work.
# This script dumps the database into a sql create script which can be used in Spaceifys setup.
echo ".dump" | sqlite3 spaceify.db > spaceify.sql
echo ".dump" | sqlite3 splash.db > splash.sql

# Use spaceify.sql like this to create a sqlite3 database:
# cat spaceify.sql | sqlite3 spaceify.db
