#!/bin/bash

# Push the latest changes to GitHub tagging it as a new version

versions=$(< versions)											# Get the current version string
vs=$(echo $versions | awk -F : '{print $2}')

git add --all .													# Add changes

git commit -m "version ${vs}"									# Commit the changes

git tag -a v${vs} -m "version ${vs}"							# Tag the commit

git push														# Push to GitHub
