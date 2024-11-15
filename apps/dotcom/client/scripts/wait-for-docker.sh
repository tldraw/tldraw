#!/bin/bash

echo "Waiting for postgres to become healthy..."
for i in {1..30}; do
	STATUS=$(docker inspect --format='{{json .State.Health.Status}}' docker-zstart_postgres-1) || echo "Still waiting..."
	if [ "$STATUS" = "\"healthy\"" ]; then
		echo "Postgres is healthy"
		break
	fi
	sleep 10
done

if [ "$STATUS" != "\"healthy\"" ]; then
	echo "Backend did not become healthy in time. Exiting."
	exit 1
fi
exit 0
