#!/usr/bin/env bash

set -eux

yarn run -T tsx ../../internal/scripts/refresh-create-templates.ts

esbuild src/index.ts \
    --bundle \
    --outfile=dist-cjs/index.cjs \
    --platform=node \
    --target=node20 \
    --sourcemap 
