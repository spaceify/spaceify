#!/bin/bash
# Prepare code directory for publication
# Spaceify Oy, 18.7.2016

cd /var/lib/spaceify/storage
node minify.js
cd ~/spaceify
rm -r code/
cp -R /var/lib/spaceify/code/ .
rm -r code/node_modules/
rm code/www/spaceify.crt
rm code/www/libs/inject/spaceify.csv
rm code/www/css/spaceify.css
chmod -R 0644 code/*
rm code/test* > /dev/null 2>&1 || true
sed -i 's/spaceify\.csv/spaceify\.min\.csv/g' code/www/libs/spaceifyinitialize.js

