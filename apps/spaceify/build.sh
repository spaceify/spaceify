#!/bin/bash
#cp $1.mf $1/manifest

rm $1.zip
cd $1
zip -r $1.zip application/
mv $1.zip ../
cd ..
