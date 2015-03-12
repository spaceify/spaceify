#!/bin/bash

#################################################################################
# Copy necessary files
cd /etc/squid3/certs/

cp ca.cnf server.cnf spaceifyCA

cd spaceifyCA

# Create key and certificate for spaceify server or application server
path="${1:-/var/lib/spaceify/data/tls/}"							# Use default values or the supplied arguments
server="${2:-Edge server}"
server=${server/"/"/"\\/"}

sed -i "s/organizationalUnitName  = Edge server/organizationalUnitName  = $server/g" server.cnf

notAfter="$(openssl x509 -enddate -noout -in spaceify.crt)"			# Get and set reasonable expiration date
notAfter=${notAfter/"notAfter="}
notAfter=$(date -ud "$notAfter" +"%Y%m%d%H%M%S")"Z"
sed -i "s/%1/$notAfter/g" ca.cnf

# Create server key and certificate request, sign the certificate request with the root CA
openssl req -newkey rsa -keyout server.key.pem -keyform PEM -out server.csr.pem -outform PEM -nodes -config server.cnf
openssl ca -batch -in server.csr.pem -out server.crt.pem -config ca.cnf

# Copying and clean up
mkdir -p $path > /dev/null 2>&1 || true

mv server.crt.pem "${path}server.crt"
mv server.key.pem "${path}server.key"

rm server.csr.pem ca.cnf server.cnf