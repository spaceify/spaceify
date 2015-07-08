#!/bin/bash -e
# Remove all Docker images created by Spaceify, 30.6.2015 Spaceify Inc.

# Docker must be installed. If it is not installed than try to remove Docker's directory.
docker > /dev/null 2>&1
if [[ $? -ne 0 ]]; then
	rm -r /var/lib/docker/ > /dev/null 2>&1
	exit 0
fi

# Get Docker images
images=$(docker images -a -q --no-trunc=true)
images=(${images//$'\n'/ })

# Get Docker image ids of installed applications
sq_images=$(sqlite3 /var/lib/spaceify/data/db/spaceify.db "SELECT docker_image_id FROM applications")
sq_images=(${sq_images//$'\n'/ })

# Stop and remove running containers of applications
. /var/lib/spaceify/data/scripts/remove_containers.sh

# Remove the images
for iid in "${images[@]}"
do
	for sq_iid in "${sq_images[@]}"; do
		if [[ "$sq_iid" = "$iid" ]]; then
			docker rmi $sq_iid > /dev/null 2>&1 || true

			break
		fi
	done

done
