#!/bin/bash
# Create an empty file for the splash screen
#sudo rm /etc/squid3/session.db > /dev/null 2>&1 || true
#sudo touch /etc/squid3/session.db > /dev/null 2>&1 || true
#sudo chown proxy.proxy /etc/squid3/session.db > /dev/null 2>&1 || true

sudo rm /tmp/squid.txt

sudo service squid3 restart
