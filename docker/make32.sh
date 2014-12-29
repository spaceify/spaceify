#!/bin/bash

ubun=$( sudo docker images )
ubun=$( echo "$ubun" | sudo sed -n '/spaceifyubuntu/{p;q;}' )
if [[ "$ubun" == "" ]]; then																# create image only if it is not in the images list

	if [ $(uname -m) != 'x86_64' ]; then													# create 32-bit image
		echo "The required Docker image is not present in the Docker's image list."
		echo "Spaceify installation will now create the image. This takes some time."

		echo "1/4 Installing temporary Debian base system to /tmp"
		sudo debootstrap raring /tmp/rootfs

		for d in raring raring-security raring-updates raring-backports
		do echo "deb http://archive.ubuntu.com/ubuntu ${d} main universe multiverse"
		done | sudo tee /tmp/rootfs/etc/apt/sources.list

		echo "2/4 Compressing the created base system"
		sudo tar czf /tmp/base32.tgz -C /tmp/rootfs .

		echo "3/4 Importing the base system image to Docker"
		sudo cat /tmp/base32.tgz | docker import - ubuntu

		echo "4/4 Removing the temporary Debian base system from /tmp"
		sudo rm -r /tmp/rootfs
		sudo rm /tmp/base32.tgz
	fi

	echo "Creating the Docker image"
	cd /var/lib/spaceify/docker
	sudo docker build -no-cache -rm -t spaceifyubuntu .
fi
