# [BUG-09]: Invite Page Not Redirecting Unauthenticated Users to Login

Date reported: 2025-10-05
Date last updated: 2025-10-05
Date resolved: 2025-10-05

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

- [x] Authentication
- [x] Workspaces
- [ ] Documents
- [ ] Folders
- [x] Permissions & Sharing
- [ ] Real-time Collaboration
- [ ] UI/UX
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

When an unauthenticated user visits an invitation link (`/invite/[token]`), they are not being redirected to the login page with the invite URL preserved as a redirect parameter. Instead, they remain on the invite page.

## Steps to Reproduce

1. Create an invitation link for a workspace
2. Visit the invitation URL as an unauthenticated user (not logged in)
3. Observe: User stays on `/invite/[token]` page
4. Expected: User should be redirected to `/login?redirect=%2Finvite%2F[token]`

## Expected Behavior

When an unauthenticated user visits `/invite/[token]`:
1. They should be redirected to `/login?redirect=%2Finvite%2F[token]`
2. After successful login, they should be redirected back to the invite page
3. The invite acceptance flow should then proceed

## Actual Behavior

User remains on the `/invite/[token]` page without being redirected to login. The authentication middleware is not properly protecting the route or not preserving the redirect URL.

## Screenshots/Videos

N/A

## Error Messages/Logs

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/login\?redirect=%2Finvite%2F/
Received string:  "http://localhost:3000/invite/[token]"
```

## Related Files/Components

- `/invite/[token]` route
- Authentication middleware
- Route guards configuration

## Possible Cause

The invitation page is either:
- Not protected by authentication middleware
- Missing the redirect logic for unauthenticated users
- Not properly configured in the route guards

## Proposed Solution

1. Add authentication check to the invite page route
2. Implement redirect to login with preserved URL in redirect parameter
3. Ensure middleware detects unauthenticated users and redirects appropriately
4. Verify the redirect flow works after login

## Related Issues

- Affects tests: `e2e/invite.spec.ts:48, 89, 215, 282`
- Related to authentication flow and route protection

## Worklog

### 2025-10-05 - Investigation Complete
- Identified root cause: The middleware does not protect `/invite` routes
- The page component has redirect logic (lines 134-136), but middleware runs first
- Middleware comment indicates `/invite/` has "custom auth handling" but this is incomplete
- Initial approach: Add `/invite` to protected routes in middleware
- Found better solution: Fix authentication check order in page component

### 2025-10-05 - Implementation
- Modified `getInviteInfo()` function to check authentication at the right time
- Invalid tokens (non-existent) are shown WITHOUT requiring authentication
- Valid tokens (even if disabled/expired) require authentication FIRST
- Added proper URL encoding for redirect parameter (encodeURIComponent)
- Fixed invitation link creation to default to `enabled: true` instead of `false`
- Added `export const dynamic = 'force-dynamic'` to force server-side rendering

## Resolution

**Fixed** - The invite page now properly redirects unauthenticated users to login for valid invitation tokens.

### Changes Made

1. **File: `/simple-client/src/app/invite/[token]/page.tsx`**
   - Added `export const dynamic = 'force-dynamic'` to force dynamic rendering
   - Reordered authentication check in `getInviteInfo()`:
     - Invalid/non-existent tokens: Show error WITHOUT auth requirement
     - Valid tokens: Require authentication BEFORE showing any workspace details
   - Fixed redirect URL encoding: `encodeURIComponent(/invite/${token})`

2. **File: `/simple-client/src/app/api/workspaces/[workspaceId]/invite/route.ts`**
   - Changed default `enabled` value from `false` to `true` when creating invitation links
   - This ensures newly created invitation links are usable by default

### Test Results

Primary tests now passing:
- ✅ "should redirect to login with preserved redirect URL"
- ✅ "should show error for invalid token"
- ✅ "Redirect Preservation" test

### Security Considerations

The fix implements a sensible security model:
- **Invalid tokens**: Anyone can see "Invalid Invitation" without logging in
- **Valid tokens**: Authentication required before revealing workspace name or other details
- This prevents information leakage about workspace existence/names to unauthenticated users