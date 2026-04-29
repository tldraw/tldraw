#!/bin/bash

until curl -s http://localhost:7654 | grep -q "ok"; do
  echo "Waiting for migrations to finish..."
  sleep 2
done
echo "Migrations are ready!"
