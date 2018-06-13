#!/bin/bash
npm start &
while :
do
	curl http://localhost:4000/synctx
	sleep 1
done

