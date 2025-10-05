# [MEM-05]: Member Limit Guardrails

Date created: 2025-10-04
Date last updated: 2025-10-05
Date completed: 2025-10-05

## Status

- [ ] Not Started
- [ ] In Progress
- [ ] Blocked
- [x] Done

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

- [x] Member invite and add endpoints validate workspace membership count before inserting new members and block additions beyond configured limit with descriptive error messages.
- [x] UI surfaces friendly warning when member count crosses threshold (e.g., 90) encouraging workspace owners to prune memberships.
- [x] Observability captures when limit blocks are hit for future capacity planning.

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

- 2025-10-05: Created WORKSPACE_LIMITS constants with MAX_MEMBERS=100 and WARNING_THRESHOLD=90
- 2025-10-05: Updated invite join endpoint to use constants and add warnings
- 2025-10-05: Added audit logging when member limit blocks occur
- 2025-10-05: Created database function check_workspace_member_limit for efficient counting
- 2025-10-05: Updated UI to show member count (X/100) and warning banner at 90+ members
- 2025-10-05: Added E2E tests for limit enforcement and warning display

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]

## Notes from engineering lead

Successfully implemented member limit guardrails with a 100 member limit per workspace:

1. **Configuration**: Created centralized constants in `lib/constants.ts` with MAX_MEMBERS=100 and WARNING_THRESHOLD=90 for easy future adjustment.

2. **API Enforcement**: Updated invitation join endpoint to check member count before allowing joins, with proper error messages and audit logging when limits are exceeded.

3. **Database Functions**: Added helper functions for efficient member counting directly in PostgreSQL.

4. **UI Warnings**: Enhanced workspace members page to show current count (X/100) and display a prominent yellow warning banner when approaching the limit (90+ members).

5. **Observability**: Integrated audit logging to track when member limit blocks occur, useful for future capacity planning.

The implementation is flexible and ready for future plan-based differentiation (e.g., different limits for free/pro/enterprise tiers).
