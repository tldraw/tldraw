# [BUG-10]: Document Duplication Fails Due to Auth/User Sync Issue

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
- [ ] Workspaces
- [x] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [ ] UI/UX
- [x] API
- [x] Database
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: All
- OS: All
- Environment: local/staging/production
- Affected version/commit: simple-dotcom branch

## Description

When attempting to duplicate a document from the workspace browser page, the operation fails with a 500 Internal Server Error. The client displays "Failed to duplicate document" alert. The issue stems from a mismatch between authentication and user database sync where a user exists in `auth.users` but not in `public.users`.

## Steps to Reproduce

1. Navigate to workspace browser page
2. Click the duplicate option in a document's menu
3. Observe "Failed to duplicate document" alert
4. Check server logs for error

## Expected Behavior

Document should be duplicated successfully with "(copy)" appended to the name, maintaining the same workspace and folder location, with sharing_mode reset to 'private'.

## Actual Behavior

API returns 500 error with message "Failed to duplicate document". No duplicate is created. The insert fails due to foreign key constraint violation when `created_by` references a user that doesn't exist in `public.users`.

## Screenshots/Videos

N/A

## Error Messages/Logs

```
[19:16:15.778] ERROR: API Exception
  status_code: 500
  error_code: "INTERNAL_ERROR"
  err: {
    "type": "ApiException",
    "message": "Failed to duplicate document",
    "statusCode": 500,
    "code": "INTERNAL_ERROR"
  }
```

Stack trace: Error occurs at POST route in duplicate endpoint (`simple-client/src/app/api/documents/[documentId]/duplicate/route.ts:670`)

## Related Files/Components

- `simple-client/src/app/api/documents/[documentId]/duplicate/route.ts:72-87` - Insert operation that fails
- `simple-client/src/lib/supabase/server.ts:62-68` - getCurrentUser() returns auth.users ID
- `supabase/migrations/20251005000000_auth_02_sync_supabase_auth.sql:31-70` - Auth sync mechanism
- Database constraint: `documents_created_by_fkey` requires `created_by` to reference `public.users(id)`

## Possible Cause

1. **User logged in but not synced**: User authenticated in Supabase Auth but trigger failed to sync to `public.users`
2. **Test data inconsistency**: Auth state files may reference users that don't exist in `public.users`
3. **Migration timing**: User created before AUTH-02 migration was applied
4. **Direct auth.users manipulation**: Test setup or admin operations bypassed the sync trigger

The foreign key constraint `documents_created_by_fkey` enforces that `created_by` must reference a valid user in `public.users`, but `getCurrentUser()` returns the user ID from `auth.users` without verifying existence in `public.users`.

## Proposed Solution

**Option A - Safe Retrieval:** Modify `getCurrentUser()` to query `public.users` with the auth user's ID and handle missing records:
```typescript
export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) return null

  // Ensure user exists in public.users
  const { data: publicUser } = await supabase
    .from('users')
    .select('id, email, display_name, name')
    .eq('id', authUser.id)
    .single()

  if (!publicUser) {
    console.error('Auth/User sync mismatch', { authUserId: authUser.id })
    return null
  }

  return { ...authUser, ...publicUser }
}
```

**Option B - Defensive Insert:** Add fallback in duplicate route to ensure user exists before insert.

**Preventive Measures:**
1. Add data integrity check to verify all auth.users have corresponding public.users records
2. Fix test data to ensure auth state files reference users that exist in both tables
3. Add monitoring for sync mismatches
4. Consider RLS policy improvements

## Related Issues

- Related to: BUG-05 (Auth user sync failing)
- Test data issues with auth state files (`test-auth-state-*.json`)

## Worklog

2025-10-05: Implemented Option A - Modified `getCurrentUser()` to verify user exists in both `auth.users` and `public.users` before returning user data.

## Resolution

**Fixed by:** Implementing defensive check in `getCurrentUser()` function

**Changes made:**
- Modified `simple-client/src/lib/supabase/server.ts:65-90` to query `public.users` after retrieving auth user
- Added validation to ensure user exists in both `auth.users` and `public.users`
- Returns `null` if user is authenticated but not synced to `public.users`
- Added error logging to detect auth/user sync mismatches
- Returns combined user data with fields from both tables when successful

**Why this fixes the issue:**
The document duplication endpoint (and all other endpoints using `getCurrentUser()`) now safely handles the edge case where a user exists in `auth.users` but not in `public.users`. Instead of attempting to insert a document with a `created_by` value that violates the foreign key constraint, the function returns `null`, causing `requireAuth()` to throw an `UNAUTHORIZED` error, which is the correct behavior.

**Testing:**
- Document duplication e2e test passes: `e2e/document-crud.spec.ts` - "can duplicate document metadata"
- Verified no orphaned users in database after test cleanup

**Preventive measures in place:**
- Database triggers on `auth.users` (INSERT/UPDATE) sync to `public.users` automatically
- Error logging identifies when sync mismatches occur for investigation
- All API endpoints now protected from FK constraint violations via `getCurrentUser()` validation