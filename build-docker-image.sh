#!/bin/bash
# Builds a new spceifyubuntu Docker image
# Spaceify Inc. 21.4.2015

printf "\nYou are now creating a new spaceifyubuntu image. After the image is created it will uploaded to spaceify.org.\n"
printf "This script uses the existing 'ubuntu' base image if it is already pulled or pulls it from Docker's registry otherwise.\n"
printf "The existing spaceifyubuntu image or the application/spacelet images on the local machine are not updated or recreated.\n"

current_version=$(< ./image_version_ordinal)
new_version=$(expr $current_version + 1)
current_image="spaceifyubuntu$current_version"
new_image="spaceifyubuntu$new_version"

printf "\nBased on the ./image_version_ordinal file the current image file is \e[42m$current_image.tgz\e[0m and the new image file will be \e[43m$new_image.tgz.\e[0m"
printf "\n\e[41mDo you want to continue and create the new image file and upload it to spaceify.org?\e[0m\n";
select yn in "Yes" "No"; do
	case $yn in
		Yes ) break;;
		No ) exit 0;;
	esac
done

# --------- DO --------- #
cd data/docker

docker build --no-cache --rm -t spaceifyubuntu2 .												# Build the image from the Dockerfile

ID=$(docker run -d spaceifyubuntu2 /bin/bash)													# Run container and get its ID

sudo docker export $ID > "$new_image.tar"														# Export the container

gzip "$new_image.tar"																			# Compress the image
mv "$new_image.tar.gz" "$new_image.tgz"

echo "Uploading the file $new_image.tgz to spaceify.org:/home/<user>"							# Upload the new image files to spaceify.org:/home/<user>

printf "Enter ssh username: "
read username

scp spaceifyubuntu.tgz "$username@spaceify.org:/home/$username" 2>/tmp/Error 1>/dev/null

if [[ $? -eq 0 ]]; then
	printf $new_version > image_version_ordinal													# Increase version number

	echo "The spaceifyubuntu image is now uploaded to $username@spaceify.org:/home/$username. Remember to manually move the files to spaceify.org/downloads."
else
	echo "Failed to copy the image to $username@spaceify.org:/home/$username."
fi

docker stop $ID	> /dev/null 2>&1 || true														# Cleanup
docker rm -f $ID > /dev/null 2>&1 || true
docker rmi spaceifyubuntu2 > /dev/null 2>&1 || true
rm "$new_image.tgz" > /dev/null 2>&1 || true
