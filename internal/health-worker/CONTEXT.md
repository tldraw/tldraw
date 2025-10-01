# Health Worker

A Cloudflare Worker that processes webhooks from [Updown](https://updown.io/) health monitoring service and forwards health status alerts to Discord.

## Architecture

**Cloudflare Worker** - Serverless function deployed on Cloudflare's edge network

- Receives HTTP webhooks from Updown monitoring service
- Transforms health events into Discord message format
- Forwards formatted messages to Discord via webhook

## Core components

**src/index.ts** - Main worker handler

- HTTP request routing and environment validation
- Processes arrays of Updown events
- Error handling and response management

**src/discord.ts** - Discord integration

- Transforms Updown events into Discord embed format
- Handles different event types (down, up, SSL issues, performance)
- Color-coded alerts (red for down, green for up, orange for warnings)

**src/updown_types.ts** - Type definitions for Updown webhook payload structure

## Event types handled

- `check.down` - Service goes down (red alert)
- `check.up` - Service comes back up (green alert)
- `check.still_down` - Ignored to prevent spam
- `check.ssl_invalid` - SSL certificate issues (red alert)
- `check.ssl_valid` - SSL certificate restored (green alert)
- `check.ssl_expiration` - SSL expiring soon (orange warning)
- `check.ssl_renewed` - SSL certificate renewed (green alert)
- `check.performance_drop` - Performance degradation (orange warning)

## Configuration

**Environment variables**

- `DISCORD_HEALTH_WEBHOOK_URL` - Discord webhook URL for sending alerts
- `HEALTH_WORKER_UPDOWN_WEBHOOK_PATH` - Secret path for Updown webhooks (security measure)

**Deployment**

- Uses Wrangler CLI for deployment to Cloudflare Workers
- Multiple environments: dev, staging, production
- Bundle size monitored (40KB limit)

## Security

- Webhook path acts as shared secret to prevent unauthorized alerts
- Only processes requests to the configured webhook path
- Returns 404 for all other requests

## Dependencies

- `@tldraw/utils` - Utility functions (exhaustiveSwitchError)
- `discord-api-types` - TypeScript types for Discord API
- `@cloudflare/workers-types` - Cloudflare Workers runtime types
