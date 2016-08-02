#!/bin/bash

# ----- Wait for the servers to come up so that the applications can be reinstalled ----- #
printf "\n\e[4mWaiting for the Spaceify's servers to come up\e[0m\n\n"

core_port=$(cat /var/lib/spaceify/code/www/libs/config.json | grep "CORE_PORT_SECURE" | sed 's/[^0-9]*//g')
appman_port=$(cat /var/lib/spaceify/code/www/libs/config.json | grep "APPMAN_PORT_SECURE" | sed 's/[^0-9]*//g')
message_port=$(cat /var/lib/spaceify/code/www/libs/config.json | grep "APPMAN_MESSAGE_PORT_SECURE" | sed 's/[^0-9]*//g')

r=0
up_count=0
while [ $r -lt 3  ]; do

	if [ $r == 0 ]; then
		port=$core_port
		name="Core server"
	elif [ $r == 1 ]; then
		port=$appman_port
		name="Application Manager server 1"
	else
		port=$message_port
		name="Application Manager server 2"
	fi

	t=20
	is_up=0
	while [ $t -gt 0 ]; do
		nc -z -w 3 0.0.0.0 $port

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

# ----- Wait for application manager to get itself up ----- #
am_ready=0
if [ $up_count == 3 ]; then
	printf "\n\e[4mWaiting for the Application Manager to initialize itself\e[0m\n\n"

	t=20
	while [ $t -gt 0 ]; do
		core_open=$(spm status | grep "core_open" | sed 's/^[^=]*=//g')

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

# ----- Installation always creates new Docker image and packages need to be reinstalled with the new image. ----- #
packages=()																							# Get the installed application packages
work_path="/tmp/docimg/"
packages_path="/var/lib/spaceify/data/installed/"

cd $packages_path

files=$(ls -tr)																						# Get files by installation date in ascending order
while read -r file; do
	if [ -f $file ] && [ $file != "readme.txt" ]; then
		packages+=("$file")
	fi
done <<< "$files"
packages_count=${#packages[@]}

if [ $up_count == 3 ] && [ $am_ready == 1 ] && [ $packages_count != 0 ]; then						# Install the packages

	printf "\n\e[4mReinstalling application packages from $packages_path\e[0m\n"

	mkdir -p $work_path > /dev/null 2>&1 || true

	for (( i=0; i<${packages_count}; i++ )); do
		let app=i+1
		str=""
		printf "\e[32m\nInstalling package ${app} of ${packages_count}\e[0m\n\n"

		file=${packages[$i]##*/}
		cp "${packages[$i]}" "$work_path"
		spm install force "$work_path$file"

		if [ $? -eq 0 ]; then																		# Remove the package, if it was installed successfully
			rm "$packages_path$file" > /dev/null 2>&1 || true
		fi
	done

	rm -r $work_path > /dev/null 2>&1 || true

elif [ $packages_count != 0 ]; then
	printf "\nThere are saved application packages from a previous installation in the $packages_path directory.\n"
	printf "However, the services required to install the applications are not up and automatic reinstallation is not possible.\n"
	printf "The packages can installed later on manually in one of the two ways described below.\n\n";

	printf "1. Run bash script.\n";
	printf "   sudo bash /var/lib/spaceify/data/scripts/install_packages.sh\n\n"

	printf "2. Use spm.\n"
	printf "   sudo cd /var/lib/spaceify/data/installed\n"
	printf "   sudo spm install X\n"
	printf "   sudo rm X\n\n"
	printf "   Where X is a package name.\n"
	printf "   The packages should be installed in the order listed below:\n"

	for (( i=0; i<${packages_count}; i++ )); do
		printf "   ${packages[$i]##*/}\n"
	done

	printf "\nIf either of the methods do not work the Spaceify core and application manager services might need to be restarted.\n"
	printf "   sudo service spaceify restart\n"
	printf "   sudo service spaceifyappman restart\n"

fi
