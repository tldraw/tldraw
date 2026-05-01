#!/bin/bash

# Block until `apps/dotcom/zero-cache`'s `migrate --signal-success` HTTP server
# replies "ok" on localhost:7654, which means Postgres is up and all migrations
# have been applied. Used by `apps/dotcom/client` and `apps/dotcom/zero-cache`
# dev scripts to avoid racing against migration startup.

until curl -s http://localhost:7654 | grep -q "ok"; do
  echo "Waiting for migrations to finish..."
  sleep 2
done
echo "Migrations are ready!"
