#!/usr/bin/env bash

set -eux

yarn run -T tsx ../../internal/scripts/refresh-create-templates.ts

esbuild src/main.ts \
    --bundle \
    --outfile=dist-cjs/main.cjs \
    --platform=node \
    --target=node20 \
    --sourcemap 
