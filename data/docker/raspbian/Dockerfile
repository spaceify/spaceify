# VERSION 1.0.0
FROM resin/rpi-raspbian:jessie
MAINTAINER Spaceify Oy

RUN apt-get update

RUN apt-get upgrade -y

RUN apt-get install apt-utils

RUN apt-get install -y openssh-server screen unzip netcat nano dnsutils

RUN apt-get install -y python-software-properties python g++ make software-properties-common fakeroot

RUN apt-get install -y libssl-dev libsqlite3-dev libzip-dev

RUN apt-get install -y curl openssl sqlite3

RUN apt-get install -y nodejs 

RUN ln -s /usr/bin/nodejs /usr/bin/node

RUN apt-get install -y npm 

RUN npm install npm -g

RUN npm cache clear -f

RUN npm install -g n

RUN n 5.10.1

RUN mkdir -p /var/run/sshd

RUN echo "root:docker123" | chpasswd

RUN rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
