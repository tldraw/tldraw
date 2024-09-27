set -eux

# uncomment these lines to nuke the respective live databases

# npx wrangler d1 execute --env=preview botcom-preview --file=./schema.sql
# npx wrangler d1 execute --env=staging botcom-staging --file=./schema.sql
# npx wrangler d1 execute --env=production botcom-production --file=./schema.sql

# this one just resets your local database
npx wrangler d1 execute botcom-staging --env=dev --local --file=./schema.sql