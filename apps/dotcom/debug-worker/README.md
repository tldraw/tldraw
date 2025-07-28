# Debug Worker

A local debugging tool for accessing tldraw data from Cloudflare.

## Purpose

This worker provides a simple way to inspect data that's stored in Cloudflare, allowing you to debug and investigate room state without affecting production systems.

## Usage

### Option 1: Using yarn scripts (requires account ID)

Set your Cloudflare account ID:

```bash
export CLOUDFLARE_ACCOUNT_ID=your_account_id_here
```

Then run:

```bash
# Production data
yarn dev:production

# Staging data
yarn dev:staging
```

### Option 2: Direct wrangler command

```bash
# Production data
npx wrangler dev --env production --remote

# Staging data
npx wrangler dev --env staging --remote
```

The worker will be available at `http://localhost:8901`

## Environment Variables

- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID (required if using yarn scripts)
