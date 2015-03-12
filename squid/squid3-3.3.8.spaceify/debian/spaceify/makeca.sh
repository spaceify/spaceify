#!/bin/bash

#################################################################################
# Specify certificate authority diretory, files and database
cd /etc/squid3/certs/

ca_root="spaceifyCA";

# Clear existing
rm -r $ca_root > /dev/null 2>&1 || true

# Directories for CA files.
mkdir $ca_root
mkdir "$ca_root/certs"
chmod 0700 $ca_root
chmod 0700 "$ca_root/certs"

# Create serial and index files
echo "01" > "$ca_root/serial"
touch "$ca_root/index.txt"

# Create random number
expr $RANDOM % 100 > "$ca_root/rand"

# Use this configuration to create the CA
cp ca.cnf $ca_root

cd spaceifyCA

#################################################################################
# Generate the self signed certificate authority and its key.
openssl req -x509 -newkey rsa -out spaceify.crt.pem -outform PEM -days 3950 -nodes -config ca.cnf

# Strip the certificate from all its text to keep only the -CERTIFICATE- section to create a crt.
openssl x509 -in spaceify.crt.pem -out spaceify.crt
cp spaceify.key.pem spaceify.key

#################################################################################
# Make certificate available system wide as a trusted root certificate authority. Node.js doesn't require this because it uses its own certificate store!
#crtd=/usr/share/ca-certificates/spaceify

#rm -r $crtd > /dev/null 2>&1 || true
#mkdir -p $crtd

#sed -i '/spaceify\/spaceify.crt/d' /etc/ca-certificates.conf
#update-ca-certificates
#cp spaceify.crt $crtd
#printf "spaceify/spaceify.crt\n" >> /etc/ca-certificates.conf
#update-ca-certificates

#################################################################################
# Copy files and cleanup
mkdir -p /var/lib/spaceify/code/www > /dev/null 2>&1 || true
cp spaceify.crt /var/lib/spaceify/code/www

rm ca.cnf

#################################################################################
# Initialize Squid's certificate database
rm -rf /var/lib/ssl_db > /dev/null 2>&1 || true
/usr/lib/squid3/ssl_crtd -c -s /var/lib/ssl_db/ > /dev/null 2>&1 || true
chown proxy.proxy -R /var/lib/ssl_db/ > /dev/null 2>&1 || true
