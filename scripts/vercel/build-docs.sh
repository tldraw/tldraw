#!/usr/bin/env bash
set -eux

yarn run -T lazy build-api
yarn run -T lazy refresh-everything  --filter=apps/docs
yarn run -T lazy build --filter=apps/docs