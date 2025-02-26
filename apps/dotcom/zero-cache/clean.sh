#!/bin/bash
source .env
docker volume rm -f docker_tlapp_pgdata && rm -rf "${ZSTART_REPLICA_DB_FILE}"*