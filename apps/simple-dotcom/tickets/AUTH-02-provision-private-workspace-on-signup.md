# [AUTH-02]: Provision Private Workspace on Signup

Date created: 2025-10-04
Date last updated: 2025-10-04 (refined acceptance criteria)
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
- [ ] Private workspace is created synchronously during signup (before redirect to dashboard)
- [ ] Private workspace has `is_private = true` flag set
- [ ] Private workspace has `owner_id` set to the new user
- [ ] Private workspace name is set to "My Private Workspace" (or similar system-determined name)

### Database Integrity
- [ ] Private workspace row is linked to the user via `owner_id` foreign key
- [ ] Private workspace inherits CASCADE deletion behavior (deleted only when user account is deleted)

### API Protection
- [ ] API DELETE `/api/workspaces/[id]` returns 403 for private workspaces with error: "Cannot delete private workspace"
- [ ] API PATCH `/api/workspaces/[id]` returns 403 when attempting to change `name` field with error: "Cannot rename private workspace"
- [ ] API GET `/api/workspaces` includes `is_private` flag in response for client-side filtering

### UI Behavior
- [ ] Dashboard workspace list displays private workspace with visual distinction (label, icon, or badge)
- [ ] Rename action/button is hidden for private workspaces
- [ ] Delete action/button is hidden for private workspaces
- [ ] Settings page for private workspace hides or disables name input field

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

- [ ] Unit tests
- [x] Integration tests
- [x] E2E tests (Playwright)
- [x] Manual testing scenarios

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

[Track progress, decisions, and blockers as work proceeds. Each entry should include date and brief description.]

## Open questions

**Q: Should existing users without a private workspace receive one via migration?**
A: Not applicable for MVP (no existing production users). If needed in future, create a migration that provisions workspaces for users where `NOT EXISTS (SELECT 1 FROM workspaces WHERE owner_id = users.id AND is_private = true)`.

**Q: Do we intend immutable_name to be a dedicated column, or derive immutability from is_private?**
A: **Resolved** - Derive immutability from `is_private` flag only. No separate column. API validation checks `is_private` before allowing name changes.
