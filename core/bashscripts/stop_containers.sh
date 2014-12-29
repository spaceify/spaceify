#!/bin/bash -e
## Spaceify stop container, 15.7.2013 Spaceify Inc.

# Get running Docker containers and image ids of installed applications
ps=$(docker ps -a -q)
containerids=(${ps//$'\n'/ })

sq=$(sqlite3 /var/lib/spaceify/db/spaceify.db "SELECT docker_image_id FROM applications")
imageids=(${sq//$'\n'/ })

# Stop and remove containers that are started by Spaceify Core
for cid in "${containerids[@]}"
do
    image_id=$(docker inspect --format='{{.Image}}' ${cid})

    isSpaceifys=false
    for iid in "${imageids[@]}"; do
        if [[ "$iid" = "$image_id" ]]; then
            isSpaceifys=true
            break
        fi
    done

    if [ "$isSpaceifys" = true ]; then
        docker stop -t=0 $cid
        docker rm $cid
    fi
done
