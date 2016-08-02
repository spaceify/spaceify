#!/bin/bash
# Called from upstart script /etc/init/spaceifydns.conf to start Spaceify's DNS server.
# Spaceify Oy 21.4.2015

cd /var/lib/spaceify/code
node dnsservice >> /var/lib/spaceify/data/logs/spaceifydns.log 2>&1
