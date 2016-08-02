#!/bin/bash -e
# Spaceify stop container
# Spaceify Oy 15.7.2013

# Get running Docker containers and image ids of installed applications
ps=$(docker ps -a -q)
containerids=(${ps//$'\n'/ })

sq=$(sqlite3 /var/lib/spaceify/data/db/spaceify.db "SELECT docker_image_id FROM applications")
imageids=(${sq//$'\n'/ })

# Stop and remove containers that are started by Spaceify Core
for cid in "${containerids[@]}"
do
    image_id=$(docker inspect --format='{{.Image}}' ${cid} > /dev/null 2>&1 || true)

    isSpaceifys=false
    for iid in "${imageids[@]}"; do
        if [[ "$iid" = "$image_id" ]]; then
            isSpaceifys=true
            break
        fi
    done

    if [ "$isSpaceifys" = true ]; then
        docker stop -t=0 $cid > /dev/null 2>&1 || true
        docker rm $cid > /dev/null 2>&1 || true
    fi
done
