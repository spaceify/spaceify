#cd spaceify-0.1.0
read -p "Input version string (e.g. 0.1.0): " vs
dst="/tmp/build/spaceify-${vs}"

rm -r $dst > /dev/null 2>&1 || true

echo "Making directories..."
mkdir -p $dst
mkdir "${dst}/core/"
mkdir "${dst}/debian/"
mkdir "${dst}/monit/"
mkdir "${dst}/upstart/"
mkdir "${dst}/docker/"
mkdir "${dst}/ssl/"

echo "Copying files..."
cp -r core/* "${dst}/core/"
cp -r debian/* "${dst}/debian/"
cp -r monit/* "${dst}/monit/"
cp -r upstart/* "${dst}/upstart/"
cp docker/Dockerfile "${dst}/docker/"
cp ssl/openssl_client.conf "${dst}/ssl/"

cp CHANGELOG "${dst}"
cp LICENSE "${dst}"
cp README.md "${dst}"

echo "Compiling Spaceify version ${vs}"
cd $dst

chown -R root:root debian/
dpkg-buildpackage -i.svn -us -uc
#cd ..

cd -

echo "Packages are in /tmp/build"
