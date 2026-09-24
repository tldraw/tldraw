#!/usr/bin/env bash
set -eux

pnpm exec lazy build-api
pnpm exec lazy refresh-everything  --filter=apps/docs
pnpm exec lazy build --filter=apps/docs