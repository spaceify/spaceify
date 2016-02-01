#!/bin/bash
# Called from upstart script /etc/init/spaceifyappman.conf to start Spaceify's Application Manager server.
# Spaceify Inc. 12.5.2015

cd /var/lib/spaceify/code
node appmanservice >> /var/log/spaceifyappman.log 2>&1
