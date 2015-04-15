#!/bin/bash

service spaceify restart																		# Start Spaceify first!!!

#until pids=$(pidof spaceify)
#do
#	sleep 1
#done

#(sleep 1; kill $! ) &
#wait

dop=""
while [ -z "$dop" ]; do
	dop=$(docker ps -q)
done

dop=$(docker ps)

iline=""																						# Get the line with the applications unique name
while read -r line;
do
	iline=$( echo $line | grep "$1" );
done <<< "$dop"

IFS=' ' read -ra array <<< "$iline"

docker logs "${array[0]}"