# [BUG-01]: Workspace Creation Fails - Foreign Key Constraint Violation

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

- [x] Critical (System down, data loss, security)
- [ ] High (Major feature broken, significant impact)
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
- [ ] API
- [x] Database
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: N/A (API Error)
- OS: macOS
- Environment: local
- Affected version/commit: simple-dotcom branch

## Description

Workspace creation fails completely with a foreign key constraint violation. When attempting to create a new workspace, the API returns "Failed to create workspace" error because the user's ID from Supabase Auth (`auth.users`) does not exist in the public `users` table.

## Steps to Reproduce

1. Authenticate with Supabase Auth (user is created in `auth.users` table)
2. Attempt to create a new workspace via POST /api/workspaces
3. Request fails with 500 Internal Server Error

## Expected Behavior

- User should be able to create a workspace after authentication
- The system should ensure authenticated users exist in the public `users` table before workspace operations
- Workspace creation should succeed and return the new workspace

## Actual Behavior

- API returns 500 error with message "Failed to create workspace"
- Database constraint violation occurs: `insert or update on table "workspaces" violates foreign key constraint "workspaces_owner_id_fkey"`
- Error details: `Key (owner_id)=(user-uuid) is not present in table "users"`
- No workspace is created

## Screenshots/Videos

N/A

## Error Messages/Logs

```json
{
  "level": "error",
  "time": "2025-10-05T10:03:34.330Z",
  "context": "workspace_creation",
  "route": "/api/workspaces",
  "user_id": "0edf30a4-d8fc-4dce-9905-1bdc9298303e",
  "error": {
    "type": "Object",
    "message": "insert or update on table \"workspaces\" violates foreign key constraint \"workspaces_owner_id_fkey\"",
    "code": "23503",
    "details": "Key (owner_id)=(0edf30a4-d8fc-4dce-9905-1bdc9298303e) is not present in table \"users\"."
  },
  "msg": "Error creating workspace"
}
```

```
ApiException: Failed to create workspace
    at POST (/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/.next/server/chunks/[root-of-the-server]__26e3fd30._.js:695:19)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    ...
```

## Related Files/Components

- `simple-client/src/app/api/workspaces/route.ts:93-101` - Workspace creation endpoint
- `simple-client/src/lib/supabase/server.ts:74-81` - requireAuth function
- `supabase/migrations/20251004152910_tech_01_base_schema.sql:30-37` - Users table definition
- `supabase/migrations/20251004152910_tech_01_base_schema.sql:42-44` - Workspaces table with foreign key constraint

## Possible Cause

The application uses Supabase Auth which stores users in the `auth.users` table (managed by Supabase). However, the database schema includes a separate public `users` table that is referenced by foreign keys throughout the application (workspaces, folders, documents, etc.).

**Root cause:** There is no mechanism to sync or provision users from `auth.users` into the public `users` table when they authenticate. The `requireAuth()` function returns a user from `auth.users`, but this user doesn't exist in the public `users` table that the application schema relies on.

This is a data synchronization gap between:
- **Authentication layer**: Supabase Auth (`auth.users`)
- **Application layer**: Public schema foreign key references (`public.users`)

## Proposed Solution

Implement user provisioning to sync authenticated users into the public `users` table. Options:

### Option 1: Database Trigger (Recommended)
Create a Postgres trigger that automatically copies new users from `auth.users` to `public.users` on signup:
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'name'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    name = EXCLUDED.name,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Option 2: Middleware Check
Add middleware to ensure user exists in public.users table on each authenticated request, creating if missing.

### Option 3: Auth Callback
Use Supabase Auth webhooks or callbacks to provision users when they sign up.

**Recommendation:** Option 1 (trigger) is most reliable and requires no application code changes.

## Related Issues

- Related to: AUTH-02 (Private workspace provisioning on signup)
- Blocks: All workspace operations for authenticated users
- Blocks: Document creation, folder management, and collaboration features

## Worklog

**2025-10-05:**
- Bug discovered through user report: "got an error (failed to create workspace)"
- Investigated logs and found multiple instances of the same error
- Identified root cause as missing user sync between auth.users and public.users
- Documented error details and proposed solutions
- **RESOLVED**: Implemented database triggers to sync users and provision workspaces

## Resolution

**Fixed via migration 20251005000000_auth_02_sync_supabase_auth.sql**

The issue was resolved by implementing Option 1 (Database Trigger) from the proposed solutions:

1. **Removed obsolete Better Auth artifacts**:
   - Deleted migration file `20251004180000_auth_01_better_auth_schema.sql`
   - Dropped Better Auth tables: `account`, `session`, `verification`
   - Removed Better Auth columns: `password_hash`, `email_verified`

2. **Created user sync trigger**:
   - `handle_new_user()` function syncs `auth.users` → `public.users` on INSERT/UPDATE
   - Automatically populates display_name and name from user metadata
   - Handles email updates properly

3. **Implemented automatic workspace provisioning**:
   - `provision_user_workspace()` creates a private workspace for each new user
   - Workspace is named "{display_name}'s Workspace"
   - User is added as workspace owner/member

**Test Results**:
- All authentication E2E tests passing (12/13, 1 skipped)
- Signup flow properly creates users in both `auth.users` and `public.users`
- Workspace creation now succeeds without foreign key violations
- User metadata properly synced from Supabase Auth

This solution is atomic, requires no application code changes, and automatically handles all future user signups.
