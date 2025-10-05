# [BUG-05]: Auth Users Not Syncing to public.users Table

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
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [ ] UI/UX
- [x] API
- [x] Database
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: N/A (API/Database issue)
- OS: All
- Environment: local/staging/production
- Affected version/commit: simple-dotcom branch

## Description

When users are created via `supabaseAdmin.auth.admin.createUser()`, the `handle_new_user()` trigger should automatically sync them to the `public.users` table and create their private workspace. However, this sync is failing silently, causing workspace creation API calls to fail with 500 errors.

## Steps to Reproduce

1. Create a user via Supabase Admin API:
   ```typescript
   const { data, error } = await supabaseAdmin.auth.admin.createUser({
     email: 'test@example.com',
     password: 'password',
     email_confirm: true,
     user_metadata: { name: 'Test User' }
   })
   ```
2. User exists in auth.users but NOT in public.users
3. Attempt to create workspace via API:
   ```typescript
   const response = await page.request.post('/api/workspaces', {
     data: { name: 'Test Workspace' }
   })
   ```
4. API returns 500 error "Failed to create workspace"

## Expected Behavior

- User creation should trigger `handle_new_user()` function
- User should be synced to `public.users` table
- Private workspace should be created automatically
- Subsequent workspace creation API calls should succeed

## Actual Behavior

- User is created in `auth.users` successfully
- User is NOT created in `public.users` table
- Private workspace is NOT created
- Workspace creation API calls fail with 500 error due to foreign key constraint

## Screenshots/Videos

N/A

## Error Messages/Logs

**API Response:**
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to create workspace"
  }
}
```

**Database Error (not visible to API):**
```
Foreign key violation: Key (owner_id)=(uuid) is not present in table "users"
```

## Related Files/Components

- `src/app/api/workspaces/route.ts:110-126` - Workspace creation endpoint
- Database trigger: `handle_new_user()` function
- Database table: `public.users`
- Database table: `public.workspaces`
- Database table: `public.workspace_members`

## Possible Cause

The `handle_new_user()` trigger function was trying to insert into `workspace_members` with incorrect column names:
- Using `created_at` and `updated_at` columns that don't exist
- Actual table has `joined_at` column instead
- The EXCEPTION handler in the trigger was silently swallowing the error

## Proposed Solution

Update the `handle_new_user()` function to use the correct column names for the `workspace_members` table.

## Related Issues

- Related to: TEST-11 (Remaining E2E Test Failures)
- Blocks: 21 E2E tests that create workspaces via API
- Affects: All invitation/member tests, workspace creation tests

## Worklog

**2025-10-05:**
- Found root cause: Column mismatch in `handle_new_user()` trigger
- The function was trying to insert `created_at` and `updated_at` into `workspace_members`
- Table actually has `joined_at` column only
- Created migration `bug_05_fix_handle_new_user_workspace_members_columns`
- Tested fix: User creation and workspace provisioning now work correctly
- E2E tests: `e2e/auth.spec.ts` signup tests now pass (11/13 passing)

## Resolution

Fixed by updating the `handle_new_user()` function via migration `bug_05_fix_handle_new_user_workspace_members_columns`. Changed the INSERT statement to use the correct column name `joined_at` instead of `created_at` and `updated_at`. User creation and workspace provisioning now work correctly.