#!/bin/bash
# Wait for network to come up, show progress bar while waiting.
# Spaceify Oy, 13.7.2016

function progressbar()
{
	str="["
	for i in `seq 1 $2`; do
		if [[ $i -le $1 ]]; then
			str="$str="
		else
			str="$str-"
		fi

	done

	printf "$str]\r"
}

pos=$1
max=$2
size=$3
bin_size=$((max / size))

printf "\n$4\n"

false
while [ $? != 0 ]; do
	let pos+=1

	length=$((pos / bin_size))

	progressbar $length $size

	if [[ $pos == $max ]]; then
		break
	fi

	sleep 1
	ping -c 1 8.8.8.8 > /dev/null 2>&1
done

progressbar $((max / bin_size)) $size
printf "\n"

if [[ $pos == $max ]]; then										
	exit 1
fi
