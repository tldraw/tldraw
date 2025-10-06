# [SEC-01]: Rate Limiting & Abuse Prevention

Date created: 2025-10-04
Date last updated: 2025-10-05
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

- [x] Authentication
- [x] Workspaces
- [x] Documents
- [ ] Folders
- [x] Permissions & Sharing
- [ ] Real-time Collaboration
- [ ] UI/UX
- [x] API
- [ ] Database
- [x] Testing
- [x] Infrastructure

## Description

Implement rate limiting and abuse prevention for **M2 critical endpoints**: authentication flows and invitation link operations. This provides essential security for the MVP while deferring more advanced rate limiting (password reset, general API protection, captcha) to M3 hardening phase.

## Acceptance Criteria

### M2 Scope (MVP Required)
- [ ] Auth endpoints (`/api/auth/sign-in`, `/api/auth/sign-up`) enforce per-IP rate limits (e.g., 10 requests/15 minutes) with 429 responses and retry-after headers.
- [ ] Invitation endpoints throttled:
  - `/api/workspaces/[id]/invite` (regeneration): Max 5 regenerations/hour per workspace
  - `/api/invite/[token]` (validation): Max 20 validations/5 minutes per IP
- [ ] Rate limit responses include clear error messages without exposing internal thresholds.
- [ ] Rate limit configuration documented with recommended thresholds for production.

### Deferred to M3 (Launch Hardening)
- Password reset endpoint throttling
- Document sharing endpoint rate limits (lower priority; covered by membership checks)
- Captcha integration hooks (when thresholds exceeded)
- Advanced monitoring/alerting dashboards (TECH-07 handles basic logging)

## Technical Details

### Database Schema Changes

- None expected; optionally create audit table for blocked events.

### API Endpoints

- Integrate rate limiting middleware (e.g., Upstash Redis, Cloudflare KV) across targeted routes.
- Standardize 429 responses with retry-after headers for clients.

### UI Components

- Ensure UI handles rate limit responses gracefully (toast/inline messaging) without exposing internal thresholds.

### Permissions/Security

- Align limits with product requirements; implement IP allowlist for internal/admin operations as needed.
- Record blocked attempts for security review.

## Dependencies

- AUTH-01/AUTH-03 authentication endpoints.
- MEM-03 invitation lifecycle.
- PERM-02 sharing endpoint.

## Testing Requirements

- [ ] Unit tests
- [x] Integration tests
- [ ] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Engineering notes: eng-meeting-notes.md lines 212-214 (rate limiting invites).
- Product requirements referencing invite security.

## Notes

Coordinate with security review (SEC-02, if created later) to validate configuration before launch.

## Estimated Complexity

- [x] Small (< 1 day)
- [ ] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

**Note:** Reduced from Medium (1-3 days) to Small-Medium (1-2 days) by scoping to auth + invite endpoints only. Advanced features deferred to M3.

## Worklog

2025-10-05: Scoped to M2 essentials (auth + invites only). Password reset, sharing, captcha, and advanced monitoring deferred to M3 hardening phase.

## Open questions

- Which rate limiting backend should we use: Upstash Redis vs Cloudflare KV?
  → Cloudflare KV preferred for consistency with Workers deployment (COLLAB-01B).
- Should rate limits be stricter in production vs development?
  → Yes, use environment-based configuration with relaxed limits in dev.
