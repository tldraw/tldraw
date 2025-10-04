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

- [x] Authentication
- [x] Workspaces
- [x] Permissions & Sharing
- [ ] Documents
- [ ] Folders
- [ ] Real-time Collaboration
- [ ] UI/UX
- [ ] API
- [ ] Database
- [x] Testing
- [x] Infrastructure

## Description

Establish the foundational Playwright end-to-end suite for Milestone 1, covering authentication, workspace provisioning, navigation shell access, and baseline access control so we can extend coverage as later milestones land.

## Acceptance Criteria

- [ ] Playwright project configured with Supabase-focused fixtures and worker runtime stubs so tests can run locally and in CI without polluting shared environments.
- [ ] Automated flows cover signup, login, logout, password recovery, and re-authentication guard rails (e.g., invalid credentials, locked sessions).
- [ ] Workspace scenarios validate provisioning on signup, workspace listing/dashboard navigation, owner safeguards on delete, and private access enforcement for unauthorized sessions.
- [ ] Route guard tests ensure unauthenticated users are redirected away from protected areas (dashboard, workspace routes) to the auth entry point.
- [ ] CI pipeline executes the E2E suite on merge and performs deterministic setup/teardown seeded via test fixtures.

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

- TECH-01 Supabase schema foundation.
- TECH-04 API surface area.
- AUTH-01 authentication flows.
- AUTH-02 private workspace provisioning on signup.
- AUTH-03 password recovery flow.
- AUTH-05 private workspace validation rules.
- NAV-05 route structure and guards.

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
- When setting up the test infrastructure, also unblock **API integration tests for TECH-04** (api-surface-area.md) so workspace endpoints and auth guards share the same fixtures.
- API integration tests should cover workspace CRUD, private workspace access rules, and navigation route guards that align with Milestone 1 exit criteria.
- Reuse the Supabase test project, seeded accounts, and teardown scripts from the Playwright suite to keep coverage consistent.
- Consider using Next.js API route testing utilities or direct HTTP calls with seeded auth tokens for deterministic checks.

## Estimated Complexity

- [ ] Small (< 1 day)
- [ ] Medium (1-3 days)
- [x] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

[Track progress, decisions, and blockers as work proceeds. Each entry should include date and brief description.]

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
