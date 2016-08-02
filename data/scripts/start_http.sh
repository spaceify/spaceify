#!/bin/bash
# Called from upstart script /etc/init/spaceifyhttp.conf to start Spaceify's HTTP/HTTPS servers.
# Spaceify Oy 17.6.2015

cd /var/lib/spaceify/code
node httpservice >> /var/lib/spaceify/data/logs/spaceifyhttp.log 2>&1
