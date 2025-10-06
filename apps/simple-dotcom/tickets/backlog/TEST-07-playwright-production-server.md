# [TEST-07]: Run Playwright against production Next server

Date created: 2025-10-08
Date last updated: -
Date completed: -

## Status

- [x] Not Started
- [ ] In Progress
- [ ] Blocked
- [ ] Done

## Priority

- [ ] P0 (MVP Required)
- [x] P1 (Post-MVP)

## Category

- [ ] Authentication
- [ ] Workspaces
- [ ] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [ ] UI/UX
- [ ] API
- [ ] Database
- [x] Testing
- [x] Infrastructure

## Description

Adjust the Playwright webServer configuration to exercise the app via `next build` + `next start` (or an equivalent lightweight production server) instead of `next dev --turbopack`. This reduces rebuild overhead, eliminates dev-only delays, and brings local/CI behaviour closer to production.

## Acceptance Criteria

- [ ] Update `apps/simple-dotcom/simple-client/playwright.config.ts` to build once and launch a production server before tests start.
- [ ] Ensure local runs reuse an existing server when provided via `PLAYWRIGHT_BASE_URL` to avoid repeated builds.
- [ ] Add CI step(s) to perform `next build` prior to running Playwright tests.
- [ ] Document the new workflow and any additional env flags in the E2E README.

## Technical Details

### Database Schema Changes

None.

### API Endpoints

None.

### UI Components

None.

### Permissions/Security

No changes.

## Dependencies

- Build pipeline must have enough memory/time budget for Next.js production build.

## Testing Requirements

- [ ] Unit tests
- [ ] Integration tests
- [x] E2E tests (Playwright)
- [ ] Manual testing scenarios

## Related Documentation

- `apps/simple-dotcom/simple-client/e2e/README.md`
- `apps/simple-dotcom/simple-client/playwright.config.ts`

## Notes

- Evaluate using `next start --hostname 127.0.0.1 --port 3000` to avoid IPv6 issues in CI.

## Estimated Complexity

- [x] Small (< 1 day)
- [ ] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

- Pending start.

## Open questions

- Should we offer a fast path for local iteration (e.g. flag to keep using `next dev`)?
