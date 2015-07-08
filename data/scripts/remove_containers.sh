#!/bin/bash -e
# Stop and remove all Spaceify's containers, 15.7.2013 Spaceify Inc.

# Docker must be installed. If it is not installed than try to remove Docker's directory.
docker > /dev/null 2>&1
if [[ $? -ne 0 ]]; then
	rm -r /var/lib/docker/ > /dev/null 2>&1
	exit 0
fi

# Get running Docker containers and image ids of installed applications
ps=$(docker ps -a -q --no-trunc=true)
containerids=(${ps//$'\n'/ })

sq=$(sqlite3 /var/lib/spaceify/data/db/spaceify.db "SELECT docker_image_id FROM applications")
imageids=(${sq//$'\n'/ })

# Stop and remove containers started by Spaceify Core
for cid in "${containerids[@]}"; do

	image_id=$(docker inspect --format='{{.Image}}' ${cid} 2>&1 || true)

	for iid in "${imageids[@]}"; do

		if [[ "$iid" = "$image_id" ]]; then
			docker stop -t=0 $cid > /dev/null 2>&1 || true
			docker rm $cid > /dev/null 2>&1 || true

			break
		fi
	done

done
