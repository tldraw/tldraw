#!/bin/bash
source .env
docker volume rm -f docker_tlapp_pgdata && rm -rf "${ZERO_REPLICA_FILE}"*

