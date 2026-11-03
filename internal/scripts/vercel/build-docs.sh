#!/usr/bin/env bash
set -eux

pnpm exec turbo run build --filter=./apps/docs
