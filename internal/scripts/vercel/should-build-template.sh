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
TEMPLATE_NAME="$1"
git diff main HEAD --quiet "./templates/${TEMPLATE_NAME}/"
