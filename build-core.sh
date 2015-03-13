versions=$(< versions)
vs=$(echo $versions | awk -F : '{print $2}')

dst="/tmp/build/spaceify-${vs}"

rm -r $dst > /dev/null 2>&1 || true

echo "Making directories..."
mkdir -p $dst
mkdir "${dst}/code/"
mkdir "${dst}/data/"
mkdir "${dst}/debian/"
mkdir "${dst}/docker/"
mkdir "${dst}/monit/"
mkdir "${dst}/upstart/"

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

echo "Compiling Spaceify version ${vs}"
cd $dst

chown -R root:root debian/
dpkg-buildpackage -i.svn -us -uc
#cd ..

cd -

echo "Packages are in /tmp/build"
