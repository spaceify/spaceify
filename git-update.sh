#!/bin/bash

# Push the latest changes to GitHub without tagging it as a new version (= update existing version)
versions=$(< versions)											# Get the current version string
vs=$(echo $versions | awk -F : '{print $2}')

git add --all .													# Add changes

git commit -m 'version ${vs}'									# Commit the changes

git push														# Push to GitHub
