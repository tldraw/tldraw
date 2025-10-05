# [M15-03]: Make Workspace Ownership Transfer Atomic

Date created: 2025-10-05
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
- [x] Testing
- [x] Infrastructure

## Description

The ownership transfer handler updates three tables sequentially without a transaction (`apps/simple-dotcom/simple-client/src/app/api/workspaces/[workspaceId]/transfer-ownership/route.ts:78-112`). If any update fails (e.g., new owner role update blocked by RLS), the workspace owner_id may change while member roles remain inconsistent, leaving the workspace with zero owners or duplicate owners. We must make the transfer atomic so either all mutations commit or none do, with clear rollback behaviour and audit logging.

## Acceptance Criteria

- [x] Ownership transfer executes inside a single transaction (database function or server-side transaction) so partial updates cannot occur.
- [x] Errors during transfer roll back all mutations and return a structured API error with context for debugging.
- [x] Automated tests cover success and failure paths (e.g., RLS-denied role update) and verify database state remains consistent.

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

- 2025-10-05: Created database function `transfer_workspace_ownership` that executes all ownership transfer operations atomically
- 2025-10-05: Updated API route to use the atomic RPC function instead of sequential updates
- 2025-10-05: Added comprehensive test suite covering all edge cases and failure paths
- 2025-10-05: Updated TypeScript types to include the new database function

## Notes from Engineering Lead

The implementation successfully addresses all requirements:

1. **Atomicity**: Created a PL/pgSQL function that performs all ownership transfer operations within a single transaction. If any operation fails, the entire transaction rolls back automatically.

2. **Error Handling**: The function returns structured JSON responses with success status, error codes, and descriptive messages. The API route maps these to appropriate HTTP status codes.

3. **Testing**: Comprehensive test suite covers all scenarios including success paths, permission failures, validation errors, and edge cases.

4. **Key Implementation Details**:
   - Migration file: `supabase/migrations/20251005000001_m15_03_atomic_ownership_transfer.sql`
   - Updated route: `simple-client/src/app/api/workspaces/[workspaceId]/transfer-ownership/route.ts`
   - Test file: `simple-client/src/app/api/workspaces/[workspaceId]/transfer-ownership/route.test.ts`
   - Function uses row-level locking (`FOR UPDATE`) to prevent concurrent modifications

5. **Security Considerations**:
   - Function validates ownership before any mutations
   - Prevents transfer of private workspaces
   - Ensures new owner is an existing member
   - RLS policies still apply through SECURITY DEFINER

## Open questions

- Should we emit events/notifications when ownership changes to update connected clients?
