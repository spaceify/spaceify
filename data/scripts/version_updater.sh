#!/bin/bash

# Update version in debian/changelog and the README.md files.
# Tagegd GitHub update and building debian package executes this script and it must not be executed singly.

echo "Updating versions in debian/changelog and README.md..."

versions=$(< versions)
vs=$(echo $versions | awk -F : '{print $2}')
ts=$(echo $versions | awk -F : '{print $3}')

####################
# debian/changelog #
####################

vsp=$( grep -Po "(?<=\()\b$vs\b(?=\))" debian/changelog )

if [ "$vs" = "$vsp" ]; then
	echo "Version remains the same and debian/changelog is not updated"
else
	echo "Version ${vs} added to the debian/changelog"

	vsdate=$( LANG=EN_US date +"%a, %d %b %Y %H:%M:%S %z" )

	vss="spaceify (${vs}) unstable; urgency=low\n\n  * Release ${vs} ${ts}\n\n -- Spaceify Oy <admin@spaceify.net>  ${vsdate}\n\n"

	changelog=$(< debian/changelog)
	changelog="${vss}${changelog}"

	printf "$changelog" > debian/changelog
fi

#############
# README.md #
#############

readme=$(< documentation/README.template)
readme=${readme/_version_/$vs}
readme=${readme/_tag_/$ts}

printf "$readme" > README.md
