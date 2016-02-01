#!/bin/bash
# Builds a new spceifyubuntu Docker image
# Spaceify Inc. 21.4.2015

cd data/docker

printf "\n\nCreating a new spaceifyubuntu image. The image is uploaded to spaceify.org after its creation.\n"
printf "The existing spaceifyubuntu image on local machine is not updated.\n"
printf "This script uses the existing ubuntu base image if it already exists. The ubuntu image is pulled by Docker only if it isn't already pulled.\n\n"

docker build --no-cache --rm -t spaceifyubuntu2 .												# Build the image from the Dockerfile

ID=$(docker run -d spaceifyubuntu2 /bin/bash)													# Run container and get its ID

sudo docker export $ID > spaceifyubuntu.tar														# Export the container

gzip spaceifyubuntu.tar																			# Compress the image
mv spaceifyubuntu.tar.gz spaceifyubuntu.tgz

image_version=$(< image_version)																# Increase version number
printf $(expr $image_version + 1) > image_version

echo "Uploading the files spaceifyubuntu.tgz and image_version to spaceify.org:/home/<user>"	# Upload the new image files to spaceify.org:/home/<user>

printf "Enter ssh username: "
read username

scp spaceifyubuntu.tgz image_version "$username@spaceify.org:/home/$username" 2>/tmp/Error 1>/dev/null

if [[ $? -eq 0 ]]; then
	echo "The spaceifyubuntu image is now uploaded to $username@spaceify.org:/home/$username. Remember to manually move the files to spaceify.org/downloads."
else
	echo "Failed to copy the image to $username@spaceify.org:/home/$username."

	printf $(expr $image_version - 1) > image_version											# Restore version number
fi

docker rm $ID  > /dev/null 2>&1 || true															# Cleanup
docker rmi spaceifyubuntu2 > /dev/null 2>&1 || true
rm spaceifyubuntu.tgz > /dev/null 2>&1 || true
