#! /bin/bash

set -eux

yarn run -T tsx ../../../internal/scripts/workers/dev.ts --var ASSET_UPLOAD_ORIGIN:http://localhost:8788 --var USER_CONTENT_URL:http://localhost:8789
