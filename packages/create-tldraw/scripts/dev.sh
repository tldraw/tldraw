#!/usr/bin/env bash

set -eux

pnpm build

# add the current directory in case the command deletes it
git add .

./cli.cjs "$@"
