#! /bin/bash

set -eux

pnpm -w tsx ../../../internal/scripts/workers/dev.ts --var ASSET_UPLOAD_ORIGIN:http://localhost:8788
