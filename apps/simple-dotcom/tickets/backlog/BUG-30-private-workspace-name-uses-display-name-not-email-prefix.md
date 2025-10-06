# BUG-30: Private workspace name uses display_name not email prefix

**Status**: New
**Date reported**: 2025-10-05
**Reporter**: System
**Priority**: Medium
**Category**: Workspaces
**Ticket**: AUTH-02

---

## Summary

The test `'should prevent renaming private workspace via API'` in `workspace.spec.ts` is failing because the private workspace name is generated from the user's `display_name` field instead of the email prefix. The test expects the workspace name to be based on the email prefix (e.g., `test-worker-0-0-1759695330937-gti3eq's Workspace`), but the actual name is `Playwright Worker 0's Workspace` because the fixture sets `display_name` in the user metadata.

---

## Steps to Reproduce

1. Run the e2e test:
   ```bash
   cd simple-client
   npx playwright test e2e/workspace.spec.ts --grep "should prevent renaming private workspace via API"
   ```
2. The test will fail with:
   ```
   Expected: "test-worker-0-0-1759695330937-gti3eq's Workspace"
   Received: "Playwright Worker 0's Workspace"
   ```

---

## Expected Behavior

The test expects private workspace names to be generated from the email prefix when there is no `display_name`:
```typescript
const emailPrefix = testUser.email.split('@')[0]
expect(unchangedWorkspace?.name).toBe(`${emailPrefix}'s Workspace`)
```

---

## Actual Behavior

Private workspace names are generated using `display_name` when available, falling back to email prefix:
```sql
COALESCE(NEW.display_name, split_part(NEW.email, '@', 1)) || '''s Workspace'
```

The test fixture sets `display_name` explicitly:
```typescript
const name = `Playwright Worker ${workerInfo.workerIndex}`
user_metadata: {
  name,
  display_name: name,
}
```

So the workspace is named `"Playwright Worker 0's Workspace"` instead of using the email prefix.

---

## Error Messages

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "test-worker-0-0-1759695330937-gti3eq's Workspace"
Received: "Playwright Worker 0's Workspace"

  1159 | 			// Private workspace name should be based on email prefix since testUser doesn't have display_name
  1160 | 			const emailPrefix = testUser.email.split('@')[0]
> 1161 | 			expect(unchangedWorkspace?.name).toBe(`${emailPrefix}'s Workspace`)
       | 			                                 ^
  1162 | 		})
```

---

## Root Cause

The issue is a mismatch between:

1. **Database logic** (`supabase/migrations/20251005000000_auth_02_sync_supabase_auth.sql:89`):
   ```sql
   COALESCE(NEW.display_name, split_part(NEW.email, '@', 1)) || '''s Workspace'
   ```
   This correctly uses `display_name` if available, otherwise falls back to email prefix.

2. **Test fixture** (`e2e/fixtures/test-fixtures.ts:113-122`):
   Sets `display_name` in user metadata:
   ```typescript
   const name = `Playwright Worker ${workerInfo.workerIndex}`
   user_metadata: {
     name,
     display_name: name,
   }
   ```

3. **Test expectation** (`e2e/workspace.spec.ts:1159-1161`):
   Incorrectly assumes no `display_name` exists:
   ```typescript
   // Private workspace name should be based on email prefix since testUser doesn't have display_name
   const emailPrefix = testUser.email.split('@')[0]
   expect(unchangedWorkspace?.name).toBe(`${emailPrefix}'s Workspace`)
   ```

---

## Affected Files

- `simple-client/e2e/workspace.spec.ts:1159-1161` - Test with incorrect assertion
- `simple-client/e2e/fixtures/test-fixtures.ts:113-122` - Fixture sets display_name
- `supabase/migrations/20251005000000_auth_02_sync_supabase_auth.sql:89` - Workspace naming logic

---

## Proposed Solution

**Option 1** (Recommended): Fix the test expectations to account for display_name
- Update tests at lines 1159-1161 and 1216-1218 to use the fixture's display_name
- Change from `${emailPrefix}'s Workspace` to `${name}'s Workspace` where name is from fixture

**Option 2**: Remove display_name from the test fixture
- Remove `display_name` from user_metadata in test-fixtures.ts
- This would make tests use email prefix but diverges from real user behavior

**Option 3**: Make tests check actual workspace name
- Query the workspace name from DB instead of assuming the format
- More flexible but less explicit about expected behavior

---

## Impact

- **Severity**: Medium - Test failures block CI/CD
- **Scope**: Two tests in workspace.spec.ts fail consistently
- **Users affected**: Developers running tests

---

## Related Issues

This also affects test at line 1216-1218:
```typescript
const emailPrefix = testUser.email.split('@')[0]
expect(privateWorkspace.name).toBe(`${emailPrefix}'s Workspace`)
```

Both locations need the same fix.

---

## Notes

The database behavior is correct - using `display_name` when available is the right behavior for real users. The test expectation is what needs to be fixed to match the fixture setup.
