# [TEST-01]: Playwright E2E Suite

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
- [x] Workspaces
- [x] Documents
- [x] Folders
- [x] Permissions & Sharing
- [x] Real-time Collaboration
- [ ] UI/UX
- [ ] API
- [ ] Database
- [x] Testing
- [x] Infrastructure

## Description

Establish Playwright end-to-end test suite covering critical MVP flows: authentication, workspace management, document operations, folder hierarchy, invite acceptance, and permission enforcement.

## Acceptance Criteria

- [ ] Playwright project configured with fixtures for Supabase test project and Cloudflare Worker test environment.
- [ ] Automated tests cover signup/login/logout, workspace create/invite/delete, document create/move/archive, folder nesting, and guest access scenarios.
- [ ] CI pipeline runs E2E tests on merge requests with reliable teardown/cleanup scripts.

## Technical Details

### Database Schema Changes

- Provide test-specific migrations/seeding to create deterministic data (fixture accounts, sample workspaces).

### API Endpoints

- Add test utilities to reset state between runs if necessary (admin endpoints or scripts).

### UI Components

- Ensure key elements include `data-testid` attributes for stable selectors.

### Permissions/Security

- Use service role with restricted scope for test seeding; avoid leaking production credentials.

## Dependencies

- AUTH-01 authentication flows.
- MEM-03 invite lifecycle for invite test coverage.

## Testing Requirements

- [x] Unit tests
- [x] Integration tests
- [x] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: TEST-01.
- Engineering notes: eng-meeting-notes.md > Testing > End-to-End Testing.

## Notes

Coordinate with infra to provision dedicated Supabase project for automated tests to avoid interfering with staging/production data.

**Related Work:**
- When setting up the test infrastructure, also implement **API integration tests for TECH-04** (api-surface-area.md) which are currently blocked.
- API integration tests should cover:
  - Workspace CRUD operations with permission enforcement
  - Document sharing modes (private, public read-only, public editable)
  - Invitation flow (generate, enable/disable, join)
  - Folder hierarchy validation (cycle prevention, depth limits)
  - Member management and ownership transfer
- These can use the same Supabase test project and test fixtures as E2E tests.
- Consider using Next.js API route testing utilities or direct HTTP calls with test auth tokens.

## Estimated Complexity

- [ ] Small (< 1 day)
- [ ] Medium (1-3 days)
- [x] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

[Track progress, decisions, and blockers as work proceeds. Each entry should include date and brief description.]

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
