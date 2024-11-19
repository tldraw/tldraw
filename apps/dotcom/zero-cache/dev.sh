#!/bin/bash

STATUS=$(docker inspect --format='{{json .State.Health.Status}}' docker-zstart_postgres-1) || echo 'not found'
if [ "$STATUS" = "\"healthy\"" ]; then
	exit 0
fi
if [ "$STATUS" = "\"starting\"" ]; then
	exit 0
fi
yarn docker-up
