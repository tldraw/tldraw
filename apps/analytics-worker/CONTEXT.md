# Analytics worker

A Cloudflare Worker that determines whether users require explicit cookie consent based on their geographic location.

## Purpose

This worker supports the tldraw analytics system by providing geographic consent checking. It helps ensure compliance with privacy regulations like GDPR, UK PECR, FADP, and LGPD by identifying users in regions that require explicit opt-in for tracking.

The worker is deployed to `tldraw-consent.workers.dev` and is called by the analytics app (`apps/analytics/`) during initialization.

## How it works

1. Receives GET request from analytics client
2. Reads user's country code from CloudFlare's `CF-IPCountry` header
3. Checks if country requires explicit consent
4. Returns JSON response indicating whether consent is required
5. Includes CORS headers for allowed tldraw origins

## API

**Endpoint**: `https://tldraw-consent.workers.dev` (or environment-specific variants)

**Method**: `GET`

**Response**:

```json
{
  "requires_consent": boolean,
  "country_code": string | null
}
```

**Caching**: Responses are cached for 1 hour (`Cache-Control: public, max-age=3600`)

## Geographic consent rules

Users in the following countries/regions require explicit consent:

**EU Member States (GDPR)**:

- Austria, Belgium, Bulgaria, Croatia, Cyprus, Czech Republic, Denmark, Estonia, Finland, France, Germany, Greece, Hungary, Ireland, Italy, Latvia, Lithuania, Luxembourg, Malta, Netherlands, Poland, Portugal, Romania, Slovakia, Slovenia, Spain, Sweden

**EEA/EFTA (GDPR)**:

- Iceland, Liechtenstein, Norway

**Other regions**:

- United Kingdom (UK PECR)
- Switzerland (FADP)
- Brazil (LGPD)

**Default behavior**: If country code cannot be determined, the worker defaults to requiring consent (conservative approach for privacy compliance).

## CORS configuration

The worker allows cross-origin requests from:

- `http://localhost:3000` - Local development
- `http://localhost:5420` - Local development
- `https://meet.google.com` - Google Meet integration
- `*.tldraw.com` - Production domains
- `*.tldraw.dev` - Development domains
- `*.tldraw.club` - Alternative domains
- `*.tldraw.xyz` - Alternative domains
- `*.tldraw.workers.dev` - Worker preview domains
- `*-tldraw.vercel.app` - Vercel preview deployments

## Development

### Running locally

```bash
yarn dev              # Start local development server
```

### Testing

```bash
yarn test             # Run tests
yarn test-ci          # Run tests in CI mode
```

### Deployment

The worker is deployed via GitHub Actions (`.github/workflows/deploy-analytics.yml`) which runs `internal/scripts/deploy-analytics.ts`.

**Environments**:

- **dev**: `tldraw-consent-dev` (for testing)
- **staging**: `tldraw-consent-staging` (deployed on push to `main`)
- **production**: `tldraw-consent` (deployed on push to `production`)

## File structure

- `src/worker.ts` - Main worker code
- `wrangler.toml` - Cloudflare Worker configuration
- `package.json` - Package configuration and scripts
- `tsconfig.json` - TypeScript configuration
- `vitest.config.ts` - Test configuration

## Integration

This worker is called by the analytics app during initialization:

1. Analytics app loads in user's browser
2. If no existing consent preference is stored
3. App calls this worker to check if consent is required
4. Based on response, app either:
   - Shows consent banner (requires_consent: true)
   - Assumes implicit consent (requires_consent: false)

See `apps/analytics/src/utils/consent-check.ts` for the client-side integration.

## Dependencies

- `@cloudflare/workers-types` - TypeScript types for Cloudflare Workers
- `wrangler` - Cloudflare Workers CLI tool

## Notes

- This is a standalone worker (not part of the analytics app bundle)
- Uses CloudFlare's edge network for low-latency responses worldwide
- Conservative default (require consent) ensures compliance even if geo-detection fails
- CORS preflight requests are handled with 24-hour cache
- Responses are cached to reduce load and improve performance
