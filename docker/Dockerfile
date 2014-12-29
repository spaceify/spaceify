# VERSION 0.2.2
FROM ubuntu:14.04
MAINTAINER Spaceify Inc.

RUN apt-get update

RUN apt-get install -y openssh-server screen unzip netcat nano dnsutils

RUN apt-get install -y python-software-properties python g++ make software-properties-common fakeroot

RUN apt-get install -y libssl-dev libsqlite3-dev libzip-dev

RUN apt-get install -y curl openssl sqlite3

RUN add-apt-repository ppa:chris-lea/node.js
RUN apt-get update
RUN apt-get install -y nodejs

RUN export NODE_PATH=/usr/lib/node_modules
# RUN fakeroot npm install -g node-gyp@0.12.2
RUN fakeroot npm install -g node-gyp
RUN npm install -g fibrous
RUN npm install -g websocket
RUN npm install -g winston
RUN npm install -g forever
RUN npm install -g request
RUN npm install -g kiwi
RUN npm install -g mkdirp
RUN fakeroot npm install -g sqlite3 --build-from-source
RUN npm install -g engine.io
RUN npm install -g engine.io-client
RUN npm install -g adm-zip
RUN fakeroot npm install -g zipper

RUN mkdir -p /var/run/sshd

RUN echo "root:docker123" | chpasswd
