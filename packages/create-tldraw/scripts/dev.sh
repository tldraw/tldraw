#!/usr/bin/env bash

set -eux

yarn build

# add the current directory in case the command deletes it
git add .

./cli.cjs "$@"
