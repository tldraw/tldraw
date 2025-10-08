# [BUG-26]: GET /api/workspaces/:id/invite Returns 404 Instead of Auto-Creating Invitation Link

Date reported: 2025-10-05
Date last updated: 2025-10-08
Date resolved: 2025-10-08

## Status

- [ ] New
- [ ] Investigating
- [ ] In Progress
- [ ] Blocked
- [x] Resolved
- [ ] Cannot Reproduce
- [ ] Won't Fix

## Severity

- [ ] Critical (System down, data loss, security)
- [x] High (Major feature broken, significant impact)
- [ ] Medium (Feature partially broken, workaround exists)
- [ ] Low (Minor issue, cosmetic)

## Category

- [ ] Authentication
- [x] Workspaces
- [ ] Documents
- [ ] Folders
- [x] Permissions & Sharing
- [ ] Real-time Collaboration
- [ ] UI/UX
- [x] API
- [ ] Database
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: All
- OS: All
- Environment: local/staging/production
- Affected version/commit: simple-dotcom branch

## Description

The `GET /api/workspaces/:workspaceId/invite` endpoint returns a 404 error when no invitation link exists, instead of auto-creating one on first access as specified in the INVITATION-SYSTEM.md documentation.

According to INVITATION-SYSTEM.md line 29:
> **When**: First time owner accesses GET `/api/workspaces/:id/invite`
> **Initial State**: `enabled: false` (owner must explicitly enable)

However, the current implementation at `simple-client/src/app/api/workspaces/[workspaceId]/invite/route.ts:60-65` throws a 404 error when no invitation link is found, breaking the auto-creation flow.

This causes the E2E test `invite.spec.ts` "should show already member message" to fail with a timeout, as it polls for the invitation link to be created but it never is.

## Steps to Reproduce

1. Create a workspace via `POST /api/workspaces`
2. Call `GET /api/workspaces/:workspaceId/invite` to retrieve/create invitation link
3. **FAILS**: API returns 404 error instead of creating the invitation link

## Expected Behavior

When `GET /api/workspaces/:workspaceId/invite` is called for the first time:
1. Check if invitation link exists for the workspace
2. If not found, **create a new invitation link** with:
   - Random secure token (via `randomBytes(32).toString('base64url')`)
   - `enabled: false` (default disabled state)
   - `created_by: userId`
   - Current timestamp
3. Return the newly created invitation link

## Actual Behavior

When `GET /api/workspaces/:workspaceId/invite` is called and no invitation link exists:
- API returns 404 error with message "Invitation link not found for this workspace"
- No invitation link is created
- Test helper `createWorkspaceWithInvite` times out waiting for link to be created

## Screenshots/Videos

N/A

## Error Messages/Logs

```
Error: Timeout 5000ms exceeded while waiting on the predicate

  32 | // Wait for database trigger to create invitation link using Playwright's polling
> 34 | await expect
     | ^
  35 |   .poll(
  36 |     async () => {
  37 |       const res = await page.request.get(`/api/workspaces/${workspaceId}/invite`)
        at createWorkspaceWithInvite (/Users/stephenruiz/Documents/GitHub/tldraw/apps/simple-dotcom/simple-client/e2e/invite.spec.ts:34:2)
```

## Related Files/Components

- `simple-client/src/app/api/workspaces/[workspaceId]/invite/route.ts:54-66` - GET endpoint that needs fixing
- `simple-client/INVITATION-SYSTEM.md:29` - Specification for auto-creation behavior
- `e2e/invite.spec.ts:34-44` - Test helper that polls for invitation link creation
- `e2e/invite.spec.ts:181-197` - Failing test: "should show already member message"

## Root Cause

The GET endpoint implementation doesn't match the specification. It queries for an existing invitation link but throws a 404 error if not found, instead of creating one automatically.

Current problematic code (`route.ts:54-66`):
```typescript
// Get invitation link
const { data: invitation, error: fetchError } = await supabase
  .from('invitation_links')
  .select('*')
  .eq('workspace_id', workspaceId)
  .single()

if (fetchError || !invitation) {
  throw new ApiException(
    404,
    ErrorCodes.INVITATION_NOT_FOUND,
    'Invitation link not found for this workspace'
  )
}
```

## Proposed Solution

Modify `GET /api/workspaces/:workspaceId/invite` to implement get-or-create pattern:

1. Query for existing invitation link
2. If found, return it
3. If not found, create new invitation link with:
   - Generate secure token: `randomBytes(32).toString('base64url')`
   - Set `enabled: false` (default state)
   - Set `created_by: user.id`
   - Set `created_at: now()`
4. Return the newly created invitation link

This matches the specification and allows the test flow to work correctly.

## Related Issues

- Blocks all invitation link E2E tests
- Required for MEM-03 (Generate, enable/disable, and regenerate workspace invitation links)

## Worklog

**2025-10-05:**
- Bug report created with title "Invite Page Not Showing Already a Member Message"
- Initial analysis performed

**2025-10-07:**
- Investigation shows workspace creation API is working correctly
- Test failure in invite.spec.ts line 187 - UI component not detecting membership status
- Bug report updated to reflect actual issue (invite page UI, not API)

**2025-10-08 (Previous Resolution - INCORRECT):**
- Ticket marked as resolved and duplicate of BUG-39
- Claimed fix was applied to reorder checks in page.tsx
- However, code inspection shows the fix was NOT actually applied (link validity still checked before membership)
- Test continues to fail, but for a different reason than originally reported

**2025-10-08 (Reopened - Root Cause Identified):**
- Re-ran test to verify BUG-26 status
- Test fails with different error: timeout waiting for invitation link creation
- Investigation reveals GET /api/workspaces/:id/invite returns 404 instead of auto-creating link
- This is a **specification mismatch** - INVITATION-SYSTEM.md line 29 specifies auto-creation on first GET
- Current implementation at route.ts:60-65 throws 404 when link not found
- Bug report completely rewritten to reflect actual issue
- Severity upgraded from Medium to High (blocks all invitation E2E tests)
- Status reset to New

**2025-10-08 (Resolved):**
- Implemented get-or-create pattern in GET /api/workspaces/:workspaceId/invite
- Changed `.single()` to `.maybeSingle()` to handle missing invitation links gracefully
- Added auto-creation logic when no invitation link exists:
  - Generates secure token using `randomBytes(32).toString('base64url')`
  - Creates invitation link with `enabled: false` (default disabled state)
  - Sets `created_by: user.id` for ownership tracking
- All 8 invitation E2E tests now pass (previously 7/8 failing)
- Fix aligns implementation with INVITATION-SYSTEM.md specification
- Ticket resolved and ready to move to resolved/ folder
