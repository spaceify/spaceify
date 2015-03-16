# VERSION 0.4.0
FROM ubuntu:14.04
MAINTAINER Spaceify Inc.

RUN apt-get update

RUN apt-get upgrade -y

RUN apt-get install -y openssh-server screen unzip netcat nano dnsutils

RUN apt-get install -y python-software-properties python g++ make software-properties-common fakeroot

RUN apt-get install -y libssl-dev libsqlite3-dev libzip-dev

RUN apt-get install -y curl openssl sqlite3

RUN add-apt-repository ppa:chris-lea/node.js
RUN apt-get update
RUN apt-get install -y nodejs

RUN mkdir -p /var/run/sshd

RUN echo "root:docker123" | chpasswd
