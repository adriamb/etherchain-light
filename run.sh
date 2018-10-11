#!/bin/bash
npm start &
while :
do
	res=$(curl http://localhost:4000/synctx 2>/dev/null)
        currentblock=$(echo $res | jq .current)
	lastindexed=$(echo $res | jq .last)
        echo $lastindexed/$currentblock
        if [ "$lastindexed" -gt "$currentblock" ] ; then 
	   sleep 1
        fi
done

