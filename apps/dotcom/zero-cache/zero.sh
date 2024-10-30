#!/bin/bash
set -e

source .env

CONNS=("$ZSTART_DB")

# Loop over all passed connection strings
for conn_str in ${CONNS[@]}; do
  >&2 echo "waiting for $conn_str"

  until psql "$conn_str" -q -c '\q'; do
    >&2 echo "Postgres is unavailable - sleeping"
    sleep 1
  done

  >&2 echo "Postgres is up - continuing"
done

# run docker/seed.sql in the zero database
# psql "$ZERO_DB" -f docker/seed.sql

yarn zero-cache