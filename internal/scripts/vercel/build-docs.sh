#!/usr/bin/env bash
set -eux

pnpm exec lazy build-api
pnpm exec lazy build --filter=apps/docs