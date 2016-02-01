#!/bin/bash
# Called from upstart script /etc/init/spaceifyhttp.conf to start Spaceify's HTTP/HTTPS servers.
# Spaceify Inc. 17.6.2015

cd /var/lib/spaceify/code
node httpservice >> /var/log/spaceifyhttp.log 2>&1
