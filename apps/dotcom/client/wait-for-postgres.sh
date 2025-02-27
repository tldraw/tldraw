#!/bin/bash

until curl -s http://localhost:7654 | grep -q "ok"; do
  echo "Waiting for Postgres to be ready..."
  sleep 2
done
echo "Postgres is ready!"