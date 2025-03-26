#!/usr/bin/env bash
set -eux

pnpm lazy build-api
pnpm lazy refresh-everything  --filter=apps/docs
pnpm lazy build --filter=apps/docs