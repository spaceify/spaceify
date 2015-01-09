cd squid3-3.3.8.spaceify
# dh_make -m --createorig # select m (multiple binary)
dpkg-buildpackage -i.svn -us -uc
cd ..
