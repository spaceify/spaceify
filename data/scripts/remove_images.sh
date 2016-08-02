#!/bin/bash -e
# Remove all Docker images created by Spaceify
# Spaceify Oy 30.6.2015

# ----- Docker and sqlite3 must be installed. Exit if either of them is not installed. ----- #

docker > /dev/null 2>&1
if [ $? -ne 0 ]; then exit 0; fi

sqlite3 "" "" > /dev/null 2>&1
if [ $? -ne 0 ]; then exit 0; fi

# ----- Stop and remove running containers first ----- #
. /var/lib/spaceify/data/scripts/remove_containers.sh

# ----- Remove the images ----- #
printf "\n\e[4mDocker images\e[0m\n"

	# -- Get Docker images -- #
images=$(docker images -a -q --no-trunc=true)
images=(${images//$'\n'/ })

	# -- Get Docker image ids of installed applications-- #
sq_images=$(sqlite3 /var/lib/spaceify/data/db/spaceify.db "SELECT docker_image_id FROM applications") > /dev/null 2>&1
sq_images=(${sq_images//$'\n'/ })

printf "\nRemoving the application images.\n"

for iid in "${images[@]}"
do
	for sq_iid in "${sq_images[@]}"; do
		if [[ "$sq_iid" = "$iid" ]]; then
			docker rmi -f $sq_iid > /dev/null 2>&1 || true

			break
		fi
	done

done

	# -- Remove Spaceify's image last -- #
printf "\nRemoving spaceifyubuntu image.\n"
docker rmi spaceifyubuntu > /dev/null 2>&1 || true
