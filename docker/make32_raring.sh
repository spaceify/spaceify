#!/bin/bash

ubun=$( sudo docker images )
ubun=$( echo "$ubun" | sudo sed -n '/spaceifyubuntu/{p;q;}' )
if [[ "$ubun" == "" ]]; then																# create image only if it is not in the images list

	if [ $(uname -m) != 'x86_64' ]; then													# create 32-bit image
		printf "\nThe required Docker image is not present in the Docker's image list.\nSpaceify installation will now create the image. This takes some time."

		printf "\n1/4 Installing temporary Debian base system to /tmp\n\n"
		#sudo debootstrap raring /tmp/rootfs
		#for d in raring raring-security raring-updates raring-backports
		#do echo "deb http://archive.ubuntu.com/ubuntu ${d} main universe multiverse"
		#done | sudo tee /tmp/rootfs/etc/apt/sources.list

		sudo debootstrap raring /tmp/rootfs
		deb="deb http://archive.ubuntu.com/ubuntu/ raring main restricted\n"
		deb="${deb}deb-src http://archive.ubuntu.com/ubuntu/ raring main restricted\n"
		deb="${deb}deb http://archive.ubuntu.com/ubuntu/ raring-updates main restricted\n"
		deb="${deb}deb-src http://archive.ubuntu.com/ubuntu/ raring-updates main restricted\n"
		deb="${deb}deb http://archive.ubuntu.com/ubuntu/ raring universe\n"
		deb="${deb}deb-src http://archive.ubuntu.com/ubuntu/ raring universe\n"
		deb="${deb}deb http://archive.ubuntu.com/ubuntu/ raring-updates universe\n"
		deb="${deb}deb-src http://archive.ubuntu.com/ubuntu/ raring-updates universe\n"
		deb="${deb}deb http://archive.ubuntu.com/ubuntu/ raring multiverse\n"
		deb="${deb}deb-src http://archive.ubuntu.com/ubuntu/ raring multiverse\n"
		deb="${deb}deb http://archive.ubuntu.com/ubuntu/ raring-updates multiverse\n"
		deb="${deb}deb-src http://archive.ubuntu.com/ubuntu/ raring-updates multiverse\n"
		deb="${deb}deb http://archive.ubuntu.com/ubuntu/ raring-backports main restricted universe multiverse\n"
		deb="${deb}deb-src http://archive.ubuntu.com/ubuntu/ raring-backports main restricted universe multiverse\n"
		deb="${deb}deb http://security.ubuntu.com/ubuntu raring-security main restricted\n"
		deb="${deb}deb-src http://security.ubuntu.com/ubuntu raring-security main restricted\n"
		deb="${deb}deb http://security.ubuntu.com/ubuntu raring-security universe\n"
		deb="${deb}deb-src http://security.ubuntu.com/ubuntu raring-security universe\n"
		deb="${deb}deb http://security.ubuntu.com/ubuntu raring-security multiverse\n"
		deb="${deb}deb-src http://security.ubuntu.com/ubuntu raring-security multiverse\n"
		deb="${deb}deb http://archive.canonical.com/ubuntu raring partner\n"
		deb="${deb}deb-src http://archive.canonical.com/ubuntu raring partner\n"
		sudo printf "$deb" > /tmp/rootfs/etc/apt/sources.list

		printf "\n2/4 Compressing the created base system\n\n"
		sudo tar czf /tmp/base32.tgz -C /tmp/rootfs .

		printf "\n3/4 Importing the base system image to Docker\n\n"
		sudo cat /tmp/base32.tgz | docker import - ubuntu

		printf "\n4/4 Removing the temporary Debian base system from /tmp\n\n"
		sudo rm -r /tmp/rootfs
		sudo rm /tmp/base32.tgz
	fi

	printf "\nCreating the Docker image\n\n"
	cd /var/lib/spaceify/docker
	sudo docker build -no-cache -rm -t spaceifyubuntu .
fi
