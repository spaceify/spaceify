# SPACEIFY STARTS -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
prevdir=$(pwd)
cd /etc/squid3/certs/

# Create Spaceify Root CA certificate and sign an Edge Server certificate for edge.spaceify.net, if certificates don't already exist.
# if [ ! -f "/etc/squid3/certs/spaceifyCA/spaceifyCA.crt" ]; then
key="4096"
days="3650"

# Delete existing files/directories - Create the directory structure and necessary files for ca signing - Create a "random" serial for signed certificates (Unix epoch)
sudo rm -r spaceifyCA/ > /dev/null 2>&1 || true
perl mk_new_ca_dir.pl spaceifyCA
sudo echo $(date +%s) > spaceifyCA/ca.db.serial

# Create the Spaceify Root CA and move the certificate and key to the spaceifyCA directory
sudo openssl genrsa -out spaceifyCA.key $key
sudo openssl req -new -x509 -days $days -key spaceifyCA.key -out spaceifyCA.crt -config openssl.conf
sudo mv spaceifyCA.crt spaceifyCA/ > /dev/null 2>&1 || true
sudo mv spaceifyCA.key spaceifyCA/ > /dev/null 2>&1 || true

# Make the Edge Server certificate and key
sudo openssl genrsa -out spaceify.key $key
sudo openssl req -new -key spaceify.key -out spaceify.csr -config openssl_server.conf
sudo openssl ca -batch -in spaceify.csr -out spaceify.crt -keyfile spaceifyCA/spaceifyCA.key -cert spaceifyCA/spaceifyCA.crt -config openssl_server.conf
#fi

# Publish the Spaceify Root CA certificate in Spaceify's www directory
if [ -d "/var/lib/spaceify/www/" ]; then
sudo cp spaceifyCA/spaceifyCA.crt /var/lib/spaceify/www/ > /dev/null 2>&1 || true
fi

# Copy the web server certificate and key to Spaceify's ssl directory
if [ -d "/var/lib/spaceify/ssl/" ]; then
sudo cp spaceify.crt /var/lib/spaceify/ssl/ > /dev/null 2>&1 || true
sudo cp spaceify.key /var/lib/spaceify/ssl/ > /dev/null 2>&1 || true
fi

# Initialize Squid's certificate database
sudo rm -rf /var/lib/ssl_db > /dev/null 2>&1 || true
sudo /usr/lib/squid3/ssl_crtd -c -s /var/lib/ssl_db/ > /dev/null 2>&1 || true
sudo chown proxy.proxy -R /var/lib/ssl_db/ > /dev/null 2>&1 || true

cd $prevdir

# Update application certificates

# Restart Squid
service squid3 restart
