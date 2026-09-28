#!/usr/bin/env bash
set -eux

# Exit 0 skips the build, exit 1 builds.
if [[ "$VERCEL_GIT_COMMIT_REF" == "examples" || "$VERCEL_GIT_COMMIT_REF" == gh-readonly-queue/* ]]; then
  exit 0
fi
exit 1
