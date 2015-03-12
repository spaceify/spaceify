#!/bin/bash
## Spaceify iptables unix fifo, 5.11.2014 Spaceify Inc.

# Only one script can be running at a time
me="$(basename "$(test -L "$0" && readlink "$0" || echo "$0")")"
for pid in $(pidof -x $me); do
	if [ $pid != $$ ]; then
		kill -SIGINT $pid
	fi
done

# Create the pipes, if they don't exist, and start piping to iptables
pipew=/var/lib/spaceify/data/dev/iptpipew
piper=/var/lib/spaceify/data/dev/iptpiper

if [[ ! -p $pipew ]]; then
	mkfifo $pipew
fi

if [[ ! -p $piper ]]; then
        mkfifo $piper
fi

while true
do
	if read line < $pipew; then
		result=$(iptables $line 2>&1)
		echo $result > $piper
	fi
done
