#!/bin/bash
# Called from upstart script /etc/init/spaceifydhcp.conf to start Spaceify's DHCP server.
# Spaceify Inc. 21.4.2015

cd /var/lib/spaceify/code
node dhcpservice >> /var/log/spaceifydhcp.log 2>&1
