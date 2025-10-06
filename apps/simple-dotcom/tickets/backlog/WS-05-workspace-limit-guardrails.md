# [WS-05]: Workspace Limit Guardrails

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
- [ ] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [x] API
- [x] Database
- [ ] Testing
- [ ] Infrastructure

## Description

Implement sanity guardrails around the soft limit of ~100 workspaces per user, including backend checks and user-facing warnings when approaching the threshold.

## Acceptance Criteria

- [ ] Workspace creation endpoint monitors workspace count per user and surfaces warning when above configurable threshold (e.g., 90% of 100).
- [ ] UI displays friendly messaging or tooltip when users near limit, explaining expectations without blocking creation.
- [ ] Observability logs or metrics capture limit breaches for future tuning.

## Technical Details

### Database Schema Changes

- None.

### API Endpoints

- Extend `/api/workspaces` create handler to evaluate count via Supabase query and return warning metadata in response.

### UI Components

- Update workspace creation flow to render warning inline when API returns soft-limit flag.

### Permissions/Security

- Ensure guardrails respect private workspace (does not count toward limit) per product direction if applicable.

## Dependencies

- WS-01 workspace creation logic.
- PERF-01 observability instrumentation.

## Testing Requirements

- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: WS-05.
- Engineering notes: eng-meeting-notes.md > Feature Complexity > Workspace limits.

## Notes

Revisit threshold values post-launch once real usage is observed; keep limit configurable via environment or feature flags.

## Estimated Complexity

- [x] Small (< 1 day)
- [ ] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

[Track progress, decisions, and blockers as work proceeds. Each entry should include date and brief description.]

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
