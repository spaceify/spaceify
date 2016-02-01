# VERSION 0.5.0
FROM ubuntu:14.04
MAINTAINER Spaceify Inc.

RUN apt-get update && \

apt-get upgrade -y && \

apt-get install -y openssh-server screen unzip netcat nano dnsutils && \

apt-get install -y python-software-properties python g++ make software-properties-common fakeroot && \

apt-get install -y libssl-dev libsqlite3-dev libzip-dev && \

apt-get install -y curl openssl sqlite3 && \

add-apt-repository ppa:chris-lea/node.js && \

apt-get update && \

apt-get install -y nodejs && \

mkdir -p /var/run/sshd && \

echo "root:docker123" | chpasswd && \

rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
