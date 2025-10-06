# [TEST-09]: Tune Playwright trace & video capture

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

Reduce Playwright runtime overhead by capturing traces and videos only when failures occur, while still allowing engineers to opt-in to richer artifacts during debugging.

## Acceptance Criteria

- [ ] Update `playwright.config.ts` defaults to `trace: 'retain-on-failure'` and `video: 'off'` (or equivalent minimal impact setting).
- [ ] Add environment variable overrides (e.g. `PW_TRACE=1`) to re-enable rich artifacts on demand.
- [ ] Adjust CI configuration to surface traces/videos only on failing jobs.
- [ ] Document the new defaults and override instructions in the E2E README.

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

None.

## Testing Requirements

- [ ] Unit tests
- [ ] Integration tests
- [x] E2E tests (Playwright)
- [ ] Manual testing scenarios

## Related Documentation

- `apps/simple-dotcom/simple-client/playwright.config.ts`
- `apps/simple-dotcom/simple-client/e2e/README.md`

## Notes

- Consider also disabling screenshot capture on success for parity.

## Estimated Complexity

- [x] Small (< 1 day)
- [ ] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

- Pending start.

## Open questions

- Should we archive artifacts for flaky-test retries automatically even when they pass on retry?
