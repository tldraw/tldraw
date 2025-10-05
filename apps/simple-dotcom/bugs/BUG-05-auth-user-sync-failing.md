# BUG-05: Auth Users Not Syncing to public.users Table

**Status:** ✅ Resolved
**Priority:** High
**Found By:** E2E Test Investigation (TEST-11)
**Affects:** All workspace creation via API
**Resolution:** Fixed in migration `bug_05_fix_handle_new_user_workspace_members_columns`

## Problem

When users are created via `supabaseAdmin.auth.admin.createUser()`, the `handle_new_user()` trigger should automatically sync them to the `public.users` table and create their private workspace. However, this sync is failing silently, causing workspace creation API calls to fail with 500 errors.

## Reproduction

```typescript
// In e2e tests
const { data, error } = await supabaseAdmin.auth.admin.createUser({
  email: 'test@example.com',
  password: 'password',
  email_confirm: true,
  user_metadata: { name: 'Test User' }
})

// User exists in auth.users but NOT in public.users

// Later, trying to create workspace fails:
const response = await page.request.post('/api/workspaces', {
  data: { name: 'Test Workspace' }
})
// Returns: 500 "Failed to create workspace"
```

## Root Cause Analysis

1. **Foreign Key Constraint**: `workspaces.owner_id` has FK to `public.users.id`
2. **Missing Sync**: Users created in `auth.users` aren't appearing in `public.users`
3. **Silent Failure**: The `handle_new_user()` trigger has `EXCEPTION WHEN OTHERS ... RETURN NEW`, which logs a warning but doesn't fail user creation
4. **API Failure**: When API tries to insert workspace, FK constraint violation causes 500 error

## Affected Code

### API Route (fails here)
`src/app/api/workspaces/route.ts:110-126`
```typescript
const { data: workspace, error: workspaceError } = await supabaseAdmin
  .from('workspaces')
  .insert({
    owner_id: user.id,  // ← This user.id doesn't exist in public.users
    name: body.name.trim(),
    is_private: false,
  })
  .select()
  .single()
```

### Database Trigger (failing silently)
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert into public.users
  INSERT INTO public.users (id, email, name, ...)
  VALUES (NEW.id, NEW.email, ...);

  -- Create private workspace
  INSERT INTO public.workspaces (...) VALUES (...);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to provision workspace for user %: %', NEW.id, SQLERRM;
    RETURN NEW;  -- ← Swallows the error!
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Error Messages

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

**Database Error** (not visible to API):
```
Foreign key violation: Key (owner_id)=(uuid) is not present in table "users"
```

## Investigation Needed

1. Check Postgres logs to see if trigger is actually firing
2. Check if trigger is encountering errors (foreign key violations, missing tables, etc.)
3. Verify trigger is enabled: `SELECT tgenabled FROM pg_trigger WHERE tgname = 'on_auth_user_created'`
4. Test trigger manually with a sample user insert

## Proposed Fix

**Option 1: Fix the trigger** (investigate why it's failing)
- Check Postgres logs for warnings from the trigger
- Fix any constraint violations or missing dependencies
- Remove the `EXCEPTION` handler or make it re-raise critical errors

**Option 2: Sync users explicitly in API** (workaround)
- In `requireAuth()`, check if user exists in `public.users`
- If not, insert them before continuing
- This is a band-aid but would unblock tests

**Option 3: Fix test fixtures** (workaround for tests only)
- Manually insert users into `public.users` after creating auth users
- Create private workspace manually
- Doesn't fix the underlying bug

## Impact

- **E2E Tests**: 21 tests failing (all that create workspaces via API) - see list below
- **Production**: Potentially affects real user signups if trigger is also failing there
- **User Experience**: Users can't create workspaces after signup

## Affected Tests

The following tests all fail due to this bug (workspace creation API returns 500):

1. `e2e/invitation-links.spec.ts` - All tests that use `createWorkspaceWithInvite()` helper:
   - non-owner cannot see invitation management UI
   - handles network errors gracefully

2. `e2e/invite.spec.ts` - All tests using `createWorkspaceWithInvite()`:
   - should redirect to login with preserved redirect URL
   - should join workspace after signup
   - should join workspace immediately when authenticated
   - should show already member message
   - should show error for disabled link
   - should show error for regenerated token
   - should preserve redirect when switching between login and signup

3. `e2e/member-limit.spec.ts` - Tests using UI-based workspace creation:
   - shows warning when approaching member limit
   - prevents joining workspace when at member limit
   - shows warning in API response when near limit

4. `e2e/member-management.spec.ts` - Tests using UI-based workspace creation:
   - owner can view and remove workspace members
   - search and pagination work for large member lists

5. `e2e/ownership-transfer.spec.ts`:
   - owner can transfer ownership to another member

6. `e2e/workspace-modal-ux.spec.ts`:
   - should prevent duplicate workspace names

7. `e2e/workspace.spec.ts`:
   - should prevent renaming private workspace via API
   - should verify private workspace created on signup

**Total**: 21 tests blocked by this bug

## Resolution

**Root Cause Found:**
The `handle_new_user()` trigger function was trying to insert into `workspace_members` with columns `(workspace_id, user_id, role, created_at, updated_at)`, but the actual table schema only has `(id, workspace_id, user_id, role, joined_at)`. This caused a column mismatch error that was being silently swallowed by the EXCEPTION handler in the trigger.

**Fix Applied:**
Created migration `bug_05_fix_handle_new_user_workspace_members_columns` to update the `handle_new_user()` function to use the correct column name `joined_at` instead of `created_at` and `updated_at`.

**Changed line:**
```sql
-- Before (incorrect):
INSERT INTO public.workspace_members (workspace_id, user_id, role, created_at, updated_at)
VALUES (workspace_id, NEW.id, 'owner', NOW(), NOW());

-- After (correct):
INSERT INTO public.workspace_members (workspace_id, user_id, role, joined_at)
VALUES (workspace_id, NEW.id, 'owner', NOW());
```

**Verification:**
- ✅ Direct test: Created test user via Supabase admin API - user synced to public.users and private workspace created successfully
- ✅ E2E tests: `e2e/auth.spec.ts` signup tests now pass (11/13 passing)
- ✅ User creation and workspace provisioning now work correctly

## Related

- TEST-11: Remaining E2E Test Failures
- All invitation/member tests (17-34)
- Workspace creation tests
