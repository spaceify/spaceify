#!/bin/bash

# Push the latest changes to GitHub tagging it as a new version.

printf "\n\nPushing changes as a new tagged version to GitHub\n\n"

############
# VERSIONS #
############
versions=$(< versions)
vs=$(echo $versions | awk -F : '{print $2}')

./data/scripts/version_updater.sh

##########
# GitHub #
##########
git add --all .													# Add changes

git commit -m "version ${vs}"									# Commit the changes

git tag -a v${vs} -m "version ${vs}"							# Tag the commit

git push														# Push to GitHub
