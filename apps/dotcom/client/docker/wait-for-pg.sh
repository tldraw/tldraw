#!/bin/bash
set -e

# Loop over all passed connection strings
for conn_str in "$@"; do
  >&2 echo "waiting for $conn_str"

  until psql "$conn_str" -q -c '\q'; do
    >&2 echo "Postgres is unavailable - sleeping"
    sleep 1
  done

  >&2 echo "Postgres is up - continuing"
done