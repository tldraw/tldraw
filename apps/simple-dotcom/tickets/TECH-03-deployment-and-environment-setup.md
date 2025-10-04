# [TECH-03]: Deployment and Environment Setup

Date created: 2025-10-04
Date last updated: -
Date completed: -

## Status

- [x] Not Started
- [ ] In Progress
- [ ] Blocked
- [ ] Done

## Priority

- [x] P0 (MVP Required)
- [ ] P1 (Post-MVP)

## Category

- [ ] Authentication
- [ ] Workspaces
- [ ] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [x] Real-time Collaboration
- [x] UI/UX
- [x] API
- [ ] Database
- [ ] Testing
- [x] Infrastructure

## Description

Set up deployment pipelines for Next.js app on Vercel and Cloudflare Workers for sync, ensuring environment configuration, secrets management, and integration between services follow best practices.

## Acceptance Criteria

- [ ] Vercel project configured with environment variables for Supabase, Better Auth, and feature flags; CI/CD pipeline deploys main branch automatically.
- [ ] Cloudflare Workers (sync) deployed via wrangler with staging and production environments, sharing configuration with main app.
- [ ] Documentation covers how to provision environments, rotate secrets, and troubleshoot deployments.

## Technical Details

### Database Schema Changes

- None.

### API Endpoints

- Ensure environment-specific base URLs and API tokens configured for cross-service calls.

### UI Components

- N/A.

### Permissions/Security

- Implement environment-specific secret storage (Vercel secrets, Cloudflare KV) and document rotation process.

## Dependencies

- TECH-02 sync worker integration.
- AUTH-01 for env secrets (Better Auth).

## Testing Requirements

- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: TECH-03.
- Product spec: product.md > Technical Architecture > Deployment.
- Engineering notes: eng-meeting-notes.md > Dependencies & Risks > Third-party services.

## Notes

Coordinate with ops to set up monitoring hooks and alerting for both Vercel and Cloudflare deployments.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)
