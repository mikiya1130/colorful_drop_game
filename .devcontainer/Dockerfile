FROM httpd:latest

ARG DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Tokyo
ENV SHELL=/bin/bash

ARG USERNAME=${USERNAME}
ARG USER_UID=${USER_UID}

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ssh \
    git

RUN useradd --uid $USER_UID --gid $(id -g www-data) -m $USERNAME

WORKDIR /usr/local/apache2/htdocs
