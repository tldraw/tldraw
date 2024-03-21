#!/usr/bin/env bash
set -eux

if [[ "$VERCEL_ENV" == "production" ]] ; then
  echo "Always build on production";
  exit 1;
fi

## main is not production anymore, but we still always want to build it
if [[ "$VERCEL_GIT_COMMIT_REF" == "main" ]] ; then
  echo "Always build on main";
  exit 1;
fi

## on PR builds, only rebuild if the docs directory changed
git diff HEAD^ HEAD --quiet ./apps/docs

