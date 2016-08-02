#!/bin/bash
# Called from upstart script /etc/init/spaceifyappman.conf to start Spaceify's Application Manager server.
# Spaceify Oy 12.5.2015

cd /var/lib/spaceify/code
node appmanservice >> /var/lib/spaceify/data/logs/spaceifyappman.log 2>&1
