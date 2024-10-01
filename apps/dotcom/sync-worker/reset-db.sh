set -eux

# this one just resets your local database
rm -rf ./.wrangler/state/v3/d1
yes | npx wrangler d1 migrations apply botcom-dev --env=dev --local