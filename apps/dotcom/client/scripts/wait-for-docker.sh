#!/bin/bash

echo "Waiting for postgres to become healthy..."
for _ in {1..30}; do

	STATUS=$(docker inspect --format='{{json .State.Health.Status}}' docker-zstart_postgres-1 2>/dev/null)
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
