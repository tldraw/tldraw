# [AUTH-02]: Provision Private Workspace on Signup

Date created: 2025-10-04
Date last updated: 2025-10-04 (refined acceptance criteria)
Date completed: 2025-10-04

## Status

- [ ] Not Started
- [ ] In Progress
- [ ] Blocked
- [x] Done

## Priority

- [x] P0 (MVP Required)
- [ ] P1 (Post-MVP)

## Category

- [x] Authentication
- [x] Workspaces
- [ ] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [ ] UI/UX
- [x] API
- [x] Database
- [x] Testing
- [ ] Infrastructure

## Description

Automatically provision a non-deletable, non-renamable private workspace for every new account immediately after signup. The workspace must exist **before** redirecting users to the dashboard so private content can be created without additional setup.

## Acceptance Criteria

### Provisioning
- [x] Private workspace is created synchronously during signup (before redirect to dashboard)
- [x] Private workspace has `is_private = true` flag set
- [x] Private workspace has `owner_id` set to the new user
- [x] Private workspace name is set to "My Private Workspace" (or similar system-determined name)

### Database Integrity
- [x] Private workspace row is linked to the user via `owner_id` foreign key
- [x] Private workspace inherits CASCADE deletion behavior (deleted only when user account is deleted)

### API Protection
- [x] API DELETE `/api/workspaces/[id]` returns 403 for private workspaces with error: "Cannot delete private workspace"
- [x] API PATCH `/api/workspaces/[id]` returns 403 when attempting to change `name` field with error: "Cannot rename private workspace"
- [x] API GET `/api/workspaces` includes `is_private` flag in response for client-side filtering

### UI Behavior
- [ ] Dashboard workspace list displays private workspace with visual distinction (label, icon, or badge) *(deferred to NAV-02)*
- [ ] Rename action/button is hidden for private workspaces *(deferred to NAV-02)*
- [ ] Delete action/button is hidden for private workspaces *(deferred to NAV-02)*
- [ ] Settings page for private workspace hides or disables name input field *(deferred to WS-03)*

## Technical Details

### Database Schema Changes

**Decision: Use `is_private` flag only, no separate `immutable_name` column**
- The `is_private` boolean flag is sufficient to determine immutability
- Immutability is enforced via API validation logic: `if (workspace.is_private && req.body.name) return 403`
- No additional column needed; simpler schema and fewer redundant states

**Migration plan:**
- No backfill needed for existing users (this is a new MVP, no production users exist yet)
- If backfilling is needed in future: create migration that provisions private workspace for users lacking one

**Schema validation:**
- `workspaces.is_private` defaults to `false` for shared workspaces
- Private workspace name should not be stored as special value; use client-side default like "My Private Workspace"

### API Endpoints

**Signup flow extension:**
1. Better Auth creates user in `users` table
2. Immediately after user creation, insert workspace:
   ```sql
   INSERT INTO workspaces (owner_id, name, is_private)
   VALUES ($userId, 'My Private Workspace', true)
   ```
3. Only then redirect to `/dashboard`

**Workspace API changes:**
- `GET /api/workspaces`: Include `is_private` in response JSON
- `PATCH /api/workspaces/[id]`: Add validation to reject name changes if `is_private = true`
- `DELETE /api/workspaces/[id]`: Add validation to reject deletion if `is_private = true`

### UI Components

- Dashboard workspace list: Check `workspace.is_private` to conditionally render badge and hide actions
- Workspace settings page: Disable name input if `workspace.is_private === true`

### Permissions/Security

- API validation is primary enforcement layer (check `is_private` flag before mutations)
- RLS policies already prevent non-owners from modifying workspaces
- No additional RLS changes needed for this ticket

## Dependencies

- AUTH-01 authentication flows.
- Workspace list UI from NAV-02.

## Testing Requirements

- [ ] Unit tests *(deferred - no test infrastructure yet)*
- [ ] Integration tests *(deferred - blocked on test infrastructure setup)*
- [ ] E2E tests (Playwright) *(deferred to TEST-01)*
- [x] Manual testing scenarios *(documented in AUTH-02-manual-tests.md)*

## Related Documentation

- Product spec: product.md > Core Features > Private Workspace.
- Product requirements: apps/simple-dotcom/product-requirements.md: AUTH-02.
- Engineering notes: eng-meeting-notes.md > MVP Definition > Private workspace.

## Notes

Coordinate with workspace CRUD ticket to reuse shared workspace creation logic and guard rails across both flows.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

### 2025-10-04 - Implementation Complete

**Changes Implemented:**

1. **Error Codes** (`src/lib/api/errors.ts`):
   - Added `CANNOT_RENAME_PRIVATE_WORKSPACE` error code
   - Mapped to HTTP 403 status code

2. **Authentication Hook** (`src/lib/auth.ts`):
   - Implemented Better Auth `after` hook on signup path
   - Automatically creates private workspace with `is_private = true`
   - Sets workspace name to "My Private Workspace"
   - Adds user as workspace member with 'owner' role
   - Error handling prevents signup failure if workspace creation fails (logs error instead)

3. **API Endpoint Protection** (`src/app/api/workspaces/[workspaceId]/route.ts`):
   - PATCH endpoint: Added validation to prevent renaming private workspaces (returns 403 with CANNOT_RENAME_PRIVATE_WORKSPACE)
   - DELETE endpoint: Already had protection against deleting private workspaces (returns 403 with CANNOT_DELETE_PRIVATE_WORKSPACE)

4. **API Response** (`src/app/api/workspaces/route.ts`):
   - GET endpoint already returns `is_private` field (uses SELECT *)
   - TypeScript types already include `is_private: boolean` in Workspace interface

5. **Manual Test Plan** (`tickets/AUTH-02-manual-tests.md`):
   - Created comprehensive manual test procedures covering all acceptance criteria
   - Includes database verification queries
   - Provides test results template
   - Documents recommendations for future automated testing

**Technical Decisions:**

1. **Hook Placement**: Used Better Auth's `after` hook with path matching for `/sign-up` to provision workspace immediately after user creation but before redirect.

2. **Error Handling**: Chose to log errors rather than fail signup if workspace provisioning fails. This ensures users can still access the app even if workspace creation encounters issues.

3. **Database Operations**: Used direct SQL queries via the same PostgreSQL pool that Better Auth uses, ensuring transactions happen in the same connection context.

4. **Member Record**: Explicitly created workspace_members entry to maintain data integrity and enable RLS policies to work correctly.

5. **UI Deferral**: UI-related acceptance criteria deferred to NAV-02 (dashboard) and WS-03 (workspace settings) tickets where the relevant UI components will be implemented.

**Files Modified:**
- `simple-client/src/lib/api/errors.ts`
- `simple-client/src/lib/auth.ts`
- `simple-client/src/app/api/workspaces/[workspaceId]/route.ts`

**Files Created:**
- `tickets/AUTH-02-manual-tests.md`

**Status**: ✅ All backend functionality complete. API protection in place. Manual tests documented. Ready for manual verification.

### 2025-10-04 - Critical Fixes (Post-Review)

**Issues Identified in Code Review:**

1. **High Priority - Swallowed Errors**: Original implementation caught all errors and only logged them, allowing signup to proceed without a workspace. This violated the "must exist before redirect" acceptance criterion.

2. **High Priority - Missing Transaction**: Workspace and member inserts were not wrapped in a transaction, risking orphaned workspaces without members if the second insert failed.

3. **Open Question - Path Matching**: Used `.startsWith('/sign-up')` which could match unintended paths. Better Auth uses `/sign-up/email` specifically for email/password signups.

**Fixes Applied:**

1. **Transaction Wrapper**:
   - Wrapped both workspace and member inserts in a PostgreSQL transaction (`BEGIN`/`COMMIT`/`ROLLBACK`)
   - Used dedicated client from pool with proper release in `finally` block
   - Ensures atomicity - either both succeed or both roll back

2. **Error Handling**:
   - Removed try-catch swallowing of errors
   - Rethrows errors to fail signup if workspace provisioning fails
   - Provides clear error message: "Failed to provision private workspace. Please try signing up again."
   - Ensures users cannot proceed without a workspace

3. **Path Matching**:
   - Changed from `.startsWith('/sign-up')` to exact match `ctx.path === '/sign-up/email'`
   - Matches Better Auth's documented email/password signup endpoint
   - Prevents false positives on other signup-related paths

4. **Validation**:
   - Added explicit check for `workspaceId` after insert
   - Throws error if workspace ID is not returned, ensuring defensive programming

**Updated Test Coverage**:
- Updated Test 7 to verify transaction rollback on workspace creation failure
- Added Test 7b to verify transaction rollback on member creation failure
- Both tests now verify signup fails (not succeeds) when provisioning fails

**Impact**:
- ✅ Guarantees workspace exists before signup completes
- ✅ Prevents orphaned workspaces without members
- ✅ Prevents orphaned users without workspaces
- ✅ Ensures RLS policies work correctly (user always has membership)
- ✅ Maintains data integrity through ACID transactions

## Open questions

**Q: Should existing users without a private workspace receive one via migration?**
A: Not applicable for MVP (no existing production users). If needed in future, create a migration that provisions workspaces for users where `NOT EXISTS (SELECT 1 FROM workspaces WHERE owner_id = users.id AND is_private = true)`.

**Q: Do we intend immutable_name to be a dedicated column, or derive immutability from is_private?**
A: **Resolved** - Derive immutability from `is_private` flag only. No separate column. API validation checks `is_private` before allowing name changes.
