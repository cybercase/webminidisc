FROM alpine:3

RUN apk add busybox-extras tini

COPY build/ webminidisc/

ENTRYPOINT [ "/sbin/tini", "-g", "--" ]
CMD [ "httpd", "-f", "-h", "/webminidisc", "-p", "8080" ]

EXPOSE 8080
