RUN apt-get update
RUN apt-get install jq git gcc make
RUN git clone https://github.com/adriamb/etherchain-light
RUN cd /etherchain-light && npm i
RUN mkdir -p /etherchain-light/data/txdb
RUN mkdir -p /etherchain-light/data/etherchain

WORKDIR /etherchain-light

CMD ["/bin/sh","./run.sh"]
