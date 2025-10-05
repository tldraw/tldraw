# BUG-10: Document Duplication Fails Due to Auth/User Sync Issue

**Status**: Open
**Date reported**: 2025-10-05
**Severity**: High
**Category**: Documents / Authentication

## Summary

When attempting to duplicate a document from the workspace browser page, the operation fails with a 500 Internal Server Error. The client displays "Failed to duplicate document" alert.

## Steps to Reproduce

1. Navigate to workspace browser page
2. Click the duplicate option in a document's menu
3. Observe "Failed to duplicate document" alert
4. Check server logs for error

## Expected Behavior

Document should be duplicated successfully with "(copy)" appended to the name, maintaining the same workspace and folder location, with sharing_mode reset to 'private'.

## Actual Behavior

API returns 500 error with message "Failed to duplicate document". No duplicate is created.

## Error Details

### Server Error Log

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

**Stack trace**: Error occurs at POST route in duplicate endpoint (`simple-client/src/app/api/documents/[documentId]/duplicate/route.ts:670`)

## Root Cause Analysis

The issue stems from a mismatch between authentication and user database sync:

1. **getCurrentUser()** (`simple-client/src/lib/supabase/server.ts:62-68`) returns user from `auth.users` table via `supabase.auth.getUser()`
2. **Document insert** attempts to use `user.id` as `created_by` value
3. **Foreign key constraint** `documents_created_by_fkey` requires `created_by` to reference `public.users(id)` with `ON DELETE RESTRICT`
4. **Sync gap**: If user exists in `auth.users` but not in `public.users`, the insert fails

### Key Evidence

From schema inspection:

```sql
-- documents table constraint
"documents_created_by_fkey" FOREIGN KEY (created_by)
  REFERENCES users(id) ON DELETE RESTRICT

-- Auth sync trigger (AUTH-02 migration)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### Possible Causes

1. **User logged in but not synced**: User authenticated in Supabase Auth but trigger failed to sync to `public.users`
2. **Test data inconsistency**: Auth state files may reference users that don't exist in `public.users`
3. **Migration timing**: User created before AUTH-02 migration was applied
4. **Direct auth.users manipulation**: Test setup or admin operations bypassed the sync trigger

## Affected Files

- `simple-client/src/app/api/documents/[documentId]/duplicate/route.ts:72-87` - Insert operation that fails
- `simple-client/src/lib/supabase/server.ts:62-68` - getCurrentUser() returns auth.users ID
- `supabase/migrations/20251005000000_auth_02_sync_supabase_auth.sql:31-70` - Auth sync mechanism

## Impact

- Users cannot duplicate documents
- Affects all workspace members
- No workaround available from UI
- May affect other document creation operations if sync issue is widespread

## Proposed Solution

### Immediate Fix (Option A - Safe Retrieval)

Modify `getCurrentUser()` to query `public.users` with the auth user's ID and handle missing records:

```typescript
export async function getCurrentUser() {
	const supabase = await createClient()
	const {
		data: { user: authUser },
	} = await supabase.auth.getUser()

	if (!authUser) return null

	// Ensure user exists in public.users
	const { data: publicUser } = await supabase
		.from('users')
		.select('id, email, display_name, name')
		.eq('id', authUser.id)
		.single()

	if (!publicUser) {
		// User exists in auth but not public - data integrity issue
		console.error('Auth/User sync mismatch', { authUserId: authUser.id })
		return null
	}

	return { ...authUser, ...publicUser }
}
```

### Alternative Fix (Option B - Defensive Insert)

Add fallback in duplicate route to ensure user exists before insert:

```typescript
// Before insert, ensure user exists in public.users
const { data: userExists } = await supabase.from('users').select('id').eq('id', user.id).single()

if (!userExists) {
	throw new ApiException(
		500,
		ErrorCodes.INTERNAL_ERROR,
		'User sync error - please try logging out and back in'
	)
}
```

### Preventive Measures

1. **Add data integrity check**: Create a test that verifies all auth.users have corresponding public.users records
2. **Fix test data**: Ensure auth state files reference users that exist in both tables
3. **Add monitoring**: Log warnings when getCurrentUser() finds auth users without public.users records
4. **Consider RLS**: Add RLS policy helper that gracefully handles missing users

## Related Issues

- BUG-05: Auth user sync failing (may be related)
- Test data issues with auth state files (`test-auth-state-*.json`)

## Testing

To reproduce locally:

1. Create user in `auth.users` without corresponding `public.users` record
2. Login with that user
3. Attempt to duplicate any document
4. Observe failure

To verify fix:

1. Apply proposed solution
2. Test with synced users (should work)
3. Test with unsynced users (should fail gracefully with clear error)
4. Verify error logging captures the sync issue
