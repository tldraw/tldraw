# [MEM-05]: Member Limit Guardrails

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
- [x] Permissions & Sharing
- [ ] Real-time Collaboration
- [ ] UI/UX
- [x] API
- [x] Database
- [ ] Testing
- [ ] Infrastructure

## Description

Introduce sanity checks to enforce the ~100 member per workspace limit, preventing overages and surfacing warnings as the limit is approached.

## Acceptance Criteria

- [ ] Member invite and add endpoints validate workspace membership count before inserting new members and block additions beyond configured limit with descriptive error messages.
- [ ] UI surfaces friendly warning when member count crosses threshold (e.g., 90) encouraging workspace owners to prune memberships.
- [ ] Observability captures when limit blocks are hit for future capacity planning.

## Technical Details

### Database Schema Changes

- Consider adding partial index or constraint to support efficient member counting per workspace.

### API Endpoints

- Update membership creation paths (invites, direct additions) to evaluate counts and return structured warnings/errors as needed.

### UI Components

- Display count badges or warnings within member management panel when near limit.

### Permissions/Security

- Ensure limit enforcement cannot be bypassed via direct Supabase calls; rely on RLS/policies to check counts.

## Dependencies

- MEM-02 membership listing for count display.
- PERF-01 telemetry instrumentation.

## Testing Requirements

- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: MEM-05.
- Engineering notes: eng-meeting-notes.md > Feature Complexity > Member limits.

## Notes

Make limit value configurable to allow future plan-based differentiation without code changes.

## Estimated Complexity

- [x] Small (< 1 day)
- [ ] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

[Track progress, decisions, and blockers as work proceeds. Each entry should include date and brief description.]

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
