#!/bin/bash

# Build Spaceify debian package

############
# VERSIONS #
############
versions=$(< versions)
vs=$(echo $versions | awk -F : '{print $2}')

./version-updater.sh

###############
# DIRECTORIES #
###############
echo "Creating directories..."
dst="/tmp/build/spaceify-${vs}"

rm -r /tmp/build/ > /dev/null 2>&1 || true

mkdir -p $dst
mkdir "${dst}/code/"
mkdir "${dst}/data/"
mkdir "${dst}/debian/"
mkdir "${dst}/docker/"
mkdir "${dst}/monit/"
mkdir "${dst}/upstart/"

#################
# COPYING FILES #
#################
echo "Copying files..."
cp -r code/* "${dst}/code/"
cp -r data/* "${dst}/data/"
cp -r debian/* "${dst}/debian/"
cp docker/Dockerfile "${dst}/docker/"
cp -r monit/* "${dst}/monit/"
cp -r upstart/* "${dst}/upstart/"

cp CHANGELOG "${dst}"
cp LICENSE "${dst}"
cp README.md "${dst}"
cp versions "${dst}"

#############
# COMPILING #
#############
echo "Compiling Spaceify version ${vs}"
cd $dst

chown -R root:root debian/
dpkg-buildpackage -i.svn -us -uc
#cd ..

cd -

echo "Packages are in /tmp/build"
