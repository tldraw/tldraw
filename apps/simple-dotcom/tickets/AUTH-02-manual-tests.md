# AUTH-02 Manual Test Plan

## Private Workspace Provisioning and Protection

This document provides manual test procedures to verify the AUTH-02 acceptance criteria. These tests should be executed manually until automated integration test infrastructure is available.

## Prerequisites

- Supabase local development environment running (`supabase start`)
- Next.js development server running (`npm run dev`)
- Database migrations applied
- Test email credentials available

## Test 1: Private Workspace Auto-Provisioning on Signup

**Objective**: Verify that a private workspace is automatically created when a new user signs up.

**Steps**:
1. Navigate to signup page (e.g., `/signup` or `/auth/signup`)
2. Create a new account with a unique email address
3. Complete signup flow
4. Wait for redirect to dashboard

**Verification**:
```sql
-- Query database to verify private workspace exists
SELECT w.id, w.name, w.is_private, w.owner_id, wm.workspace_role
FROM workspaces w
JOIN workspace_members wm ON w.id = wm.workspace_id
WHERE w.owner_id = '<USER_ID_FROM_SIGNUP>' AND w.is_private = true;
```

**Expected Results**:
- ✅ Private workspace exists with `is_private = true`
- ✅ Workspace name is "My Private Workspace"
- ✅ `owner_id` matches the new user's ID
- ✅ User is listed as workspace member with role 'owner'
- ✅ No error occurred during signup
- ✅ User is successfully redirected to dashboard

## Test 2: Prevent Private Workspace Deletion via API

**Objective**: Verify that DELETE requests to private workspaces are rejected with 403 error.

**Steps**:
1. Get the private workspace ID from Test 1
2. Authenticate as the workspace owner
3. Send DELETE request:

```bash
curl -X DELETE 'http://localhost:3000/api/workspaces/<PRIVATE_WORKSPACE_ID>' \
  -H 'Cookie: <auth_cookie_from_browser>' \
  -H 'Content-Type: application/json'
```

**Expected Results**:
- ✅ HTTP 403 status code returned
- ✅ Error response contains:
  ```json
  {
    "success": false,
    "error": {
      "code": "CANNOT_DELETE_PRIVATE_WORKSPACE",
      "message": "Cannot delete private workspace"
    }
  }
  ```
- ✅ Workspace still exists in database (verify with query from Test 1)

## Test 3: Prevent Private Workspace Rename via API

**Objective**: Verify that PATCH requests attempting to rename private workspaces are rejected with 403 error.

**Steps**:
1. Get the private workspace ID from Test 1
2. Authenticate as the workspace owner
3. Send PATCH request:

```bash
curl -X PATCH 'http://localhost:3000/api/workspaces/<PRIVATE_WORKSPACE_ID>' \
  -H 'Cookie: <auth_cookie_from_browser>' \
  -H 'Content-Type: application/json' \
  -d '{"name": "Attempted New Name"}'
```

**Expected Results**:
- ✅ HTTP 403 status code returned
- ✅ Error response contains:
  ```json
  {
    "success": false,
    "error": {
      "code": "CANNOT_RENAME_PRIVATE_WORKSPACE",
      "message": "Cannot rename private workspace"
    }
  }
  ```
- ✅ Workspace name unchanged in database (still "My Private Workspace")

## Test 4: GET /api/workspaces Includes is_private Flag

**Objective**: Verify that workspace list endpoint returns `is_private` field for client-side filtering.

**Steps**:
1. Authenticate as a user with at least one private workspace
2. Send GET request:

```bash
curl 'http://localhost:3000/api/workspaces' \
  -H 'Cookie: <auth_cookie_from_browser>'
```

**Expected Results**:
- ✅ HTTP 200 status code returned
- ✅ Response contains array of workspaces
- ✅ Each workspace object includes `is_private` boolean field
- ✅ Private workspace has `is_private: true`
- ✅ Shared workspaces have `is_private: false`

Example response:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "owner_id": "user-uuid",
      "name": "My Private Workspace",
      "is_private": true,
      "is_deleted": false,
      "deleted_at": null,
      "created_at": "2025-10-04T...",
      "updated_at": "2025-10-04T..."
    },
    {
      "id": "uuid-2",
      "owner_id": "user-uuid",
      "name": "Team Workspace",
      "is_private": false,
      "is_deleted": false,
      "deleted_at": null,
      "created_at": "2025-10-04T...",
      "updated_at": "2025-10-04T..."
    }
  ]
}
```

## Test 5: Shared Workspace Creation Still Works

**Objective**: Verify that shared workspace creation is unaffected by private workspace logic.

**Steps**:
1. Authenticate as an existing user
2. Send POST request to create shared workspace:

```bash
curl -X POST 'http://localhost:3000/api/workspaces' \
  -H 'Cookie: <auth_cookie_from_browser>' \
  -H 'Content-Type: application/json' \
  -d '{"name": "Test Shared Workspace"}'
```

**Expected Results**:
- ✅ HTTP 201 status code returned
- ✅ Workspace created with `is_private: false`
- ✅ Workspace can be renamed via PATCH
- ✅ Workspace can be deleted via DELETE

## Test 6: Private Workspace Persists with User Account

**Objective**: Verify that private workspace follows CASCADE deletion when user account is deleted.

**Steps**:
1. Create a test user account
2. Verify private workspace was auto-provisioned
3. Delete user account from `auth.users` table (Better Auth table)
4. Query workspaces table

**Expected Results**:
- ✅ Private workspace is deleted when user is deleted (CASCADE behavior)
- ✅ Workspace_members record is also deleted

## Test 7: Transaction Rollback on Workspace Creation Failure

**Objective**: Verify that signup fails atomically if workspace provisioning fails, preventing orphaned users without workspaces.

**Steps**:
1. Temporarily modify database to cause workspace insert failure (e.g., add constraint that will be violated)
2. Attempt to sign up with a new account
3. Check database and error response

**Expected Results**:
- ❌ Signup fails with error message
- ✅ Error message: "Failed to provision private workspace. Please try signing up again."
- ✅ No user account is created (transaction rolled back)
- ✅ No workspace or workspace_members records exist
- ✅ User can retry signup and it will succeed once constraint is fixed

## Test 7b: Transaction Rollback on Member Creation Failure

**Objective**: Verify that if workspace_members insert fails, the workspace is also rolled back.

**Steps**:
1. Temporarily modify database to cause workspace_members insert failure (e.g., add constraint violation)
2. Attempt to sign up with a new account
3. Check database

**Expected Results**:
- ❌ Signup fails with error message
- ✅ No workspace record exists (rolled back)
- ✅ No workspace_members record exists
- ✅ No orphaned workspace without members
- ✅ Transaction ensures atomicity

## Test 8: Concurrent Signups

**Objective**: Verify that multiple concurrent signups each get their own private workspace.

**Steps**:
1. Create 3 test accounts simultaneously (within 1-2 seconds)
2. Query workspaces table for all three users

**Expected Results**:
- ✅ Each user has exactly one private workspace
- ✅ Each private workspace has correct `owner_id`
- ✅ No duplicate or missing workspaces

## Database Queries for Verification

### Count Private Workspaces per User
```sql
SELECT
  u.email,
  COUNT(CASE WHEN w.is_private THEN 1 END) as private_workspaces,
  COUNT(CASE WHEN NOT w.is_private THEN 1 END) as shared_workspaces
FROM users u
LEFT JOIN workspaces w ON w.owner_id = u.id AND w.is_deleted = false
GROUP BY u.id, u.email
ORDER BY u.created_at DESC;
```

### Verify Workspace Member Records
```sql
SELECT
  w.name,
  w.is_private,
  wm.workspace_role,
  u.email
FROM workspaces w
JOIN workspace_members wm ON w.id = wm.workspace_id
JOIN users u ON wm.user_id = u.id
WHERE w.is_private = true
ORDER BY w.created_at DESC;
```

### Find Users Without Private Workspace (should be empty)
```sql
SELECT u.id, u.email, u.created_at
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM workspaces w
  WHERE w.owner_id = u.id AND w.is_private = true AND w.is_deleted = false
);
```

## Test Results Template

Copy this template and fill in test results:

```
# AUTH-02 Test Results - [DATE]

Tester: [NAME]
Environment: [local/staging]
Database: [Supabase local/cloud]

## Test Results

- [ ] Test 1: Private Workspace Auto-Provisioning on Signup
  - Result: PASS / FAIL
  - Notes:

- [ ] Test 2: Prevent Private Workspace Deletion via API
  - Result: PASS / FAIL
  - Notes:

- [ ] Test 3: Prevent Private Workspace Rename via API
  - Result: PASS / FAIL
  - Notes:

- [ ] Test 4: GET /api/workspaces Includes is_private Flag
  - Result: PASS / FAIL
  - Notes:

- [ ] Test 5: Shared Workspace Creation Still Works
  - Result: PASS / FAIL
  - Notes:

- [ ] Test 6: Private Workspace Persists with User Account
  - Result: PASS / FAIL
  - Notes:

- [ ] Test 7: Transaction Rollback on Workspace Creation Failure
  - Result: PASS / FAIL
  - Notes:

- [ ] Test 7b: Transaction Rollback on Member Creation Failure
  - Result: PASS / FAIL
  - Notes:

- [ ] Test 8: Concurrent Signups
  - Result: PASS / FAIL
  - Notes:

## Overall Status: PASS / FAIL

## Issues Found:
[List any bugs or issues discovered]

## Additional Notes:
[Any other observations or comments]
```

## Automation Recommendations

When integration test infrastructure is available (e.g., Vitest, Playwright), convert these manual tests to automated tests in the following files:

- `tests/integration/auth/private-workspace-provisioning.test.ts`
- `tests/integration/api/workspace-protection.test.ts`
- `tests/e2e/signup-private-workspace.spec.ts`
