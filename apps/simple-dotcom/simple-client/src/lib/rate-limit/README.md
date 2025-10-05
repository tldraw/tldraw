# Rate Limiting Documentation

## Overview

This rate limiting implementation provides protection against abuse for critical endpoints in the simple-dotcom application. The MVP implementation uses in-memory storage which is suitable for single-instance deployments.

## Current Implementation

### Protected Endpoints

1. **Invitation Regeneration** (`/api/workspaces/[id]/invite/regenerate`)
   - Limit: 5 regenerations per hour per workspace
   - Prevents abuse of invitation link generation

2. **Invitation Validation** (`/api/invite/[token]/validate`)
   - Limit: 20 validations per 5 minutes per IP
   - Prevents brute force token guessing

3. **Join Workspace** (`/api/invite/[token]/join`)
   - Limit: 20 attempts per 5 minutes per IP (same as validation)
   - Prevents abuse of join operations

### Rate Limit Configuration

Development environment has relaxed limits for testing:
- Auth endpoints: 100 requests per 15 minutes
- Invite validation: 100 requests per 5 minutes
- Invite regeneration: 50 per hour

Production limits:
- Auth endpoints: 10 requests per 15 minutes
- Invite validation: 20 requests per 5 minutes
- Invite regeneration: 5 per hour

## Response Format

When rate limit is exceeded, the API returns:

```json
{
  "error": "Too many requests",
  "message": "You have exceeded the rate limit. Please try again later.",
  "retryAfter": 60
}
```

With HTTP headers:
- `429 Too Many Requests` status code
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when limit resets
- `Retry-After`: Seconds to wait before retrying

## UI Integration

The UI should handle 429 responses gracefully:

```typescript
const response = await fetch('/api/invite/token/validate')

if (response.status === 429) {
  const data = await response.json()
  showError(`Too many requests. Please wait ${data.retryAfter} seconds.`)
  return
}
```

## Production Upgrade Path

For production scaling, replace the in-memory store with:

### Option 1: Redis (Recommended for self-hosted)
```typescript
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

// Replace Map operations with Redis:
await redis.incr(key)
await redis.expire(key, windowSeconds)
```

### Option 2: Cloudflare KV (Recommended for edge deployment)
```typescript
// In Cloudflare Worker context
const count = await env.RATE_LIMIT_KV.get(key)
await env.RATE_LIMIT_KV.put(key, newCount, {
  expirationTtl: windowSeconds
})
```

### Option 3: Upstash Redis (Serverless-friendly)
```typescript
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_URL,
  token: process.env.UPSTASH_TOKEN
})
```

## Security Considerations

1. **IP Detection**: The system uses `X-Forwarded-For` and `X-Real-IP` headers to detect client IP. Ensure your proxy/load balancer sets these correctly.

2. **Clock Skew**: Time windows are based on server time. Clients should respect `Retry-After` headers.

3. **Memory Cleanup**: Expired entries are cleaned up every minute to prevent memory leaks.

## Testing

Run tests with:
```bash
yarn test rate-limiter.test.ts
```

## Future Enhancements (M3)

- Password reset endpoint rate limiting
- Document sharing endpoint limits
- CAPTCHA integration when limits exceeded
- Advanced monitoring and alerting
- Per-user rate limits for authenticated endpoints
- Distributed rate limiting for multi-instance deployments