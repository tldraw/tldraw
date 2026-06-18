# syntax=docker/dockerfile:1
#
# Base image for every Node-based dotcom dev service (client, workers, zero-cache).
#
# SPIKE: this is deliberately minimal. It does NOT copy the repo or run `yarn install` at
# build time — the repo is bind-mounted at runtime and dependencies are installed into named
# volumes by the one-shot `install` service in docker-compose.yml. See README.md for why
# (the "node_modules / native binaries" section).

FROM node:20-bookworm-slim

# Build tooling for the handful of deps that may compile native addons when a prebuilt binary
# is unavailable for linux (node-gyp fallback path). esbuild / workerd / @rocicorp/zero all ship
# prebuilt binaries, so this is mostly insurance — but leaving it out turns a missing prebuild
# into a hard install failure, which is exactly the kind of surprise a spike should avoid.
RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		git \
		python3 \
		make \
		g++ \
		ca-certificates \
		curl \
		procps \
	&& rm -rf /var/lib/apt/lists/*

# The repo pins yarn@4.x via the root package.json "packageManager" field; corepack honours it.
RUN corepack enable

WORKDIR /repo

# Keep the container up even if the long-running process is restarted by the orchestrator.
ENV CI=1
