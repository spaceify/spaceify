#!/bin/bash

#----- Create and initialize Docker image -----#
work_path="/tmp/docimg/"
installed_file="/var/lib/spaceify/data/docker/installed_version"

in=$(wget -qO- http://spaceify.org/downloads/image_version)									# Has the spaceify.org some version of the image available
if [ -z "$in" ]; then in=0; fi

il=0																						# Has the local computer some version of the image build/imported
if [ -s "$installed_file" ]; then il=$(< "$installed_file"); fi

ubun=$( echo $(docker images) | sed -n '/spaceifyubuntu/{p;q;}' )							# Is there really an build/imported image existing in the local computer
[ -z "$ubun" ] && su=0 || su=1

typeset -i in
typeset -i il

packages=()																					# Get the installed application packages
FILES=/var/lib/spaceify/data/installed/*
for f in $FILES; do
	if [[ "$f" != "/var/lib/spaceify/data/installed/*" ]] && [[ "$f" != "readme.txt" ]]; then
		packages+=("$f")
	fi
done
plen=${#packages[@]}
echo "${packages[0]}"
exit
reinst=0

if (($su == 0 && $il == 0 && $in == 0)) || (($su == 0 && $il != 0 && $in == 0)); then
	# 1 --- Build : No existing image build/installed and image doesn't exist in spaceify.org
	cd /var/lib/spaceify/data/docker
	printf "\nBuilding a new Docker image...\n"
	docker build --no-cache --rm -t spaceifyubuntu . > /dev/null 2>&1 || true

	reinst=1
elif (($su == 0 && $il == 0 && $in != 0)) || (($su == 0 && $il != 0 && $in != 0)) || (($su != 0 && $il == 0 && $in != 0)) || (($su != 0 && $il != 0 && $in != 0 && $il != $in)); then
	# 2 ---Import : No existing image build/installed and image exists in spaceify.org
	# 3 ---Import + clean : Image exists but versions can't be compared OR image exists and versions can be compared

	docker rmi spaceifyubuntu > /dev/null 2>&1 || true

	printf "\nDownloading the latest Docker image...\n"
	curl -o ~/spaceifyubuntu.tgz http://spaceify.org/downloads/spaceifyubuntu.tgz

	if [ -s ~/spaceifyubuntu.tgz ]; then
		printf "\nImporting the Docker image...\n"
		cat ~/spaceifyubuntu.tgz | sudo docker import - spaceifyubuntu > /dev/null
		rm ~/spaceifyubuntu.tgz > /dev/null 2>&1 || true

		reinst=1
	fi
elif (($su != 0 && $il == 0 && $in == 0)) || (($su != 0 && $il != 0 && $in == 0)); then
	# 4 ---No operation : Image exists and spaceify.org doesn't have image
	:
fi

ubun=$( echo $(docker images) | sed -n '/spaceifyubuntu/{p;q;}' )
if [ -z "$ubun" ]; then
	printf "\nAborting installation because the required spaceifyubuntu Docker image doesn't exist.\n"
	exit 1
else
	if [[ $plen != 0 && $reinst != 0 ]]; then												# Reinstall applications if there were installed applications and a new image was created
		printf "\nReinstalling existing applications...\n"

		mkdir -p $work_path > /dev/null 2>&1 || true

		for (( i=0; i<${plen}; i++ )); do
			file=${packages[$i]##*/}
			cp "${packages[$i]}" "$work_path"
			spm install "$work_path$file"
		done

		rm -r $work_path > /dev/null 2>&1 || true
	fi

	printf "$in" > "$installed_file"
fi