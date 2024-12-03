#!/bin/bash
source .env
docker volume rm -f docker_zstart_pgdata && rm -rf "${ZSTART_REPLICA_DB_FILE}"*