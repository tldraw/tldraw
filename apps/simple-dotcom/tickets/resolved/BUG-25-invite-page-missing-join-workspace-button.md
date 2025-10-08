# [BUG-25]: Invite Page Missing "Join Workspace" Button for Authenticated Users

Date reported: 2025-10-05
Date last updated: 2025-10-08
Date resolved: 2025-10-08

## Status

- [ ] New
- [ ] Investigating
- [ ] In Progress
- [ ] Blocked
- [ ] Resolved
- [x] Cannot Reproduce
- [ ] Won't Fix

## Severity

- [ ] Critical (System down, data loss, security)
- [x] High (Major feature broken, significant impact)
- [ ] Medium (Feature partially broken, workaround exists)
- [ ] Low (Minor issue, cosmetic)

## Category

- [x] Authentication
- [x] Workspaces
- [ ] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [ ] API
- [ ] Database
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: All
- OS: All
- Environment: local/staging/production
- Affected version/commit: simple-dotcom branch

## Description

When an authenticated user visits an invitation link (`/invite/[token]`), the "Join Workspace" button is not visible. This prevents authenticated users from accepting workspace invitations.

## Steps to Reproduce

1. Create a user and authenticate them
2. Create an invitation link for a workspace
3. Visit the invitation URL as the authenticated user
4. **FAILS**: "Join Workspace" button is not visible

## Expected Behavior

When an authenticated user visits `/invite/[token]`:
1. The invitation page should load with workspace details
2. A "Join Workspace" button should be visible
3. Clicking the button should add the user to the workspace
4. The user should be redirected to the workspace

## Actual Behavior

What actually happens:

## Screenshots/Videos

N/A

## Error Messages/Logs

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('text=Join Workspace')
Expected: visible
Received: <element(s) not found>
Timeout:  5000ms
```

## Related Files/Components

- `e2e/invite.spec.ts:154` - should join workspace immediately when authenticated

## Possible Cause

The invitation page is either:
- Not rendering at all for authenticated users
- Missing the UI component that displays the "Join Workspace" button
- Incorrectly checking authentication state
- Related to BUG-09 where the page may not be loading correctly

## Proposed Solution

Suggested fix or approach to resolve the bug.

## Related Issues

- Related to: [ticket/bug numbers]

## Worklog

**2025-10-05:**
- Bug report created
- Initial analysis performed

**2025-10-08:**
- Investigated bug by running e2e tests
- Initial test runs failed due to invitation link provisioning issues
- Performed database reset with `supabase db reset` to apply all migrations
- Re-ran invite.spec.ts tests - all tests passed (173 passed total)
- Test "should join workspace immediately when authenticated" is now passing
- Debug output shows "Join Workspace" button is rendering correctly
- Could not reproduce the reported issue

## Resolution

**Cannot Reproduce** - After applying all database migrations via `supabase db reset`, all invitation flow tests pass successfully. The "Join Workspace" button renders correctly for authenticated users visiting invitation links.

The original issue was likely caused by missing or outdated database migrations. The following migrations fixed invitation link provisioning:
- `20251008120000_fix_invitation_link_provisioning.sql` - Added trigger to auto-create invitation links
- `20251008130000_bug_26_enable_invitation_links_by_default.sql` - Enabled links by default

**Root Cause**: Database schema was out of sync. After applying migrations, the invitation system works as expected.

**Recommendation**: Ensure all environments run `supabase db reset` or `supabase migration up` to apply latest migrations.
