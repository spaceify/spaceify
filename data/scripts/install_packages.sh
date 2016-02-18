#!/bin/bash

# ----- Wait for the servers to come up so that the applications can be reinstalled ----- #
printf "\n\e[4mWaiting for the Spaceify's servers to come up\e[0m\n\n"

core=$(cat /var/lib/spaceify/code/www/libs/config.json | grep "CORE_PORT_WEBSOCKET_SECURE" | sed 's/[^0-9]*//g')
appman=$(cat /var/lib/spaceify/code/www/libs/config.json | grep "APPMAN_PORT_WEBSOCKET_SECURE" | sed 's/[^0-9]*//g')
message=$(cat /var/lib/spaceify/code/www/libs/config.json | grep "APPMAN_PORT_WEBSOCKET_MESSAGE_SECURE" | sed 's/[^0-9]*//g')

r=0
up_count=0
while [ $r -lt 3  ]; do

	if [ $r == 0 ]; then
		port=$core
		name="Core server"
	elif [ $r == 1 ]; then
		port=$appman
		name="Application Manager server 1"
	else
		port=$message
		name="Application Manager server 2"
	fi

	t=10
	is_up=0
	while [ $t -gt 0 ]; do
		nc -z -w 3 10.0.0.1 $port

		if [ $? -eq 0 ]; then
			let up_count+=1
			is_up=1
			break
		else
			printf "%s - %d %s %4s\r" "$name" $t "attempts remaining." ""
			let t-=1
		fi

		sleep 1
	done

	if [ $is_up == 1 ]; then
		printf "%s is up.%20s\n" "$name" ""
	else
		printf "%s is not up.%20s\n" "$name" ""
	fi

	let r+=1
done

# ----- Wait application manager to get itself up ----- #
am_ready=0
if [ $up_count == 3 ]; then
	printf "\n\e[4mWaiting for the Application Manager to initialize itself\e[0m\n\n"

	t=15
	while [ $t -gt 0 ]; do
		core_open=$(spm test | grep "core_open" | sed 's/^[^=]*=//g')

		if [[ "$core_open" == "true" ]]; then
			am_ready=1
			break
		else
			printf "%d %s %4s\r" $t "attempts remaining."
			let t-=1
		fi

		sleep 1
	done

	if [ $am_ready == 1 ]; then
		printf "Application Manager is ready.%20s\n"
	else
		printf "Application Manager is not ready.%20s\n"
	fi
fi

# ----- Docker image is always imported and packages need to be reinstalled. Only if servers are up and ready though. ----- #
packages=()                                                                                                                                                # Get the installed application packages
work_path="/tmp/docimg/"
packages_path="/var/lib/spaceify/data/installed/"
FILES=/var/lib/spaceify/data/installed/*
for f in $FILES; do
	if [[ "$f" != "${packages_path}*" ]] && [[ "$f" != "${packages_path}readme.txt" ]]; then
		packages+=("$f")
	fi
done
packages_count=${#packages[@]}

if [ $up_count == 3 ] && [ $am_ready == 1 ]; then
	if [[ $packages_count != 0 ]]; then
		printf "\n\e[4mReinstalling applications\e[0m\n\n"

		mkdir -p $work_path > /dev/null 2>&1 || true

		for (( i=0; i<${packages_count}; i++ )); do
			let app=i+1
			str=""
			printf "Reinstalling application ${app} of ${packages_count}\n\n"

			file=${packages[$i]##*/}
			cp "${packages[$i]}" "$work_path"
			spm install "$work_path$file"

			if [ $? -eq 0 ]; then							# Remove previous if package was installed successfully
				rm "$packages_path$file" > /dev/null 2>&1 || true
			fi
		done

		rm -r $work_path > /dev/null 2>&1 || true
	fi
else
	printf "\nThere are saved application packages from previous installation in /var/lib/spaceify/data/installed/.\n"
	printf "However, the services required to install the applications are not up and automatic reinstallation is not possible.\n"
	printf "Each of the applications can be installed manually using the 'spm install X' command (where X is a package name).\n"
fi
