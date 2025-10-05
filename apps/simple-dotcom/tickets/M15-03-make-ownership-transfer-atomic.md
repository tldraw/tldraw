# [M15-03]: Make Workspace Ownership Transfer Atomic

Date created: 2025-10-05
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
- [x] Testing
- [x] Infrastructure

## Description

The ownership transfer handler updates three tables sequentially without a transaction (`apps/simple-dotcom/simple-client/src/app/api/workspaces/[workspaceId]/transfer-ownership/route.ts:78-112`). If any update fails (e.g., new owner role update blocked by RLS), the workspace owner_id may change while member roles remain inconsistent, leaving the workspace with zero owners or duplicate owners. We must make the transfer atomic so either all mutations commit or none do, with clear rollback behaviour and audit logging.

## Acceptance Criteria

- [ ] Ownership transfer executes inside a single transaction (database function or server-side transaction) so partial updates cannot occur.
- [ ] Errors during transfer roll back all mutations and return a structured API error with context for debugging.
- [ ] Automated tests cover success and failure paths (e.g., RLS-denied role update) and verify database state remains consistent.

## Technical Details

### Database Schema Changes

- Optional: add a Postgres function (`transfer_workspace_ownership`) encapsulating the updates to `workspaces` and `workspace_members` so Supabase can execute it via RPC with RLS checks.

### API Endpoints

- Update `/api/workspaces/[workspaceId]/transfer-ownership` to call the transactional function or use `pg` Pool-based transaction via Better Auth connection.
- Ensure the route validates new owner eligibility before entering the transaction.

### UI Components

No UI changes required.

### Permissions/Security

- Confirm RLS policies allow the transactional call for current owners while preventing non-owners from invoking it.

## Dependencies

- Depends on `MEM-01` (role management) policy definitions.
- Coordinate with `PERM-01` if additional RLS adjustments are needed for the RPC.

## Testing Requirements

- [x] Unit tests
- [x] Integration tests
- [ ] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product spec: `product.md` > Workspace Management > Ownership transfer

## Notes

- Capture audit trail (who transferred ownership, timestamps) if not already logged via triggers.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

-

## Open questions

- Should we emit events/notifications when ownership changes to update connected clients?
