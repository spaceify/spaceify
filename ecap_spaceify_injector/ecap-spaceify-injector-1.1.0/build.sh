#!/bin/bash
rm /tmp/ecap.log
make
make install
#cp /usr/local/lib/ecap* /usr/lib/
service squid3 restart
