#!/usr/bin/env bash
source .env
npx wrangler deploy --env $TLDRAW_ENV --var "TLDRAW_ENV:$TLDRAW_ENV" --var "TEST_AUTH_SECRET:$TEST_AUTH_SECRET" --var "WORKER_NAME:pr-5113-tldraw-stress-test-multiplayer" --var "ACCESS_TOKEN:$ACCESS_TOKEN"
npx wrangler tail stress-tester-dev
