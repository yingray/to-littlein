FROM golang

COPY . /ngrok
WORKDIR /ngrok
RUN make release-server

CMD ["./bin/ngrokd", "-domain", "to.littlein.com"]