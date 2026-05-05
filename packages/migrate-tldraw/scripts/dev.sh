#!/usr/bin/env bash

set -eux

yarn build
./cli.cjs "$@"
