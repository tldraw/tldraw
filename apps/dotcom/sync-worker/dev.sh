#! /bin/bash

set -eux

yes | npx wrangler d1 migrations apply botcom-dev --env=dev --local

yarn run -T tsx ../../../internal/scripts/workers/dev.ts --var ASSET_UPLOAD_ORIGIN:http://localhost:8788