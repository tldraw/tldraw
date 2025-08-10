#!/usr/bin/env bash
set -eux

pnpm -w lazy build-api
pnpm -w lazy refresh-everything  --filter=apps/docs
pnpm -w lazy build --filter=apps/docs