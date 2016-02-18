#!/bin/bash -e
# Stop and remove all Spaceify's containers, 15.7.2013 Spaceify Inc.

# ----- Docker and sqlite3 must be installed. Exit if either of them is not installed. ----- #
docker > /dev/null 2>&1
if [ $? -ne 0 ]; then exit 0; fi

sqlite3 "" "" > /dev/null 2>&1
if [ $? -ne 0 ]; then exit 0; fi

printf "\n\e[4mDocker containers\e[0m\n"

# ----- Get running Docker containers and image ids of installed applications ----- #
dbs="/var/lib/spaceify/data/db/spaceify.db"

ps=$(docker ps -a -q --no-trunc=true)
containerids=(${ps//$'\n'/ })

sq=$(sqlite3 $dbs "SELECT docker_image_id FROM applications") > /dev/null 2>&1
imageids=(${sq//$'\n'/ })

printf "\nStop and remove application containers.\n"
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
