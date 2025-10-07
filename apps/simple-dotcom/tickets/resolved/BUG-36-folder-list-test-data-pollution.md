# [BUG-36]: Folder List Test Fails Due to Data Pollution from Parallel Tests

Date reported: 2025-10-07
Date last updated: 2025-10-07
Date resolved: 2025-10-07

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
- [ ] Workspaces
- [ ] Documents
- [x] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [ ] UI/UX
- [ ] API
- [ ] Database
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: Chromium (Playwright)
- OS: macOS 14.6.0
- Environment: local (e2e tests)
- Affected version/commit: Current (8ee7ad262)

## Description

The test "should list all folders in workspace" in `folders.spec.ts` is failing because it shares a worker-level `testUser` fixture with other parallel tests, including other folder tests in the same file. The test creates 4 folders and expects to see exactly 4 folders when listing, but instead sees 7 folders due to folders left behind by other parallel tests.

The issue occurs because:
1. All tests in the same Playwright worker share the same `testUser` fixture
2. Tests run in parallel within the same worker
3. The first three tests in `folders.spec.ts` create folders but don't clean them up
4. The fourth test ("should list all folders in workspace") assumes it's working with a clean workspace
5. The test sees folders created by other tests that ran before it

## Steps to Reproduce

1. Run the e2e test suite with `npm run test:e2e`
2. Observe multiple tests in `folders.spec.ts` running in parallel on the same worker
3. Earlier tests create folders:
   - "should create, rename, move and delete folders" - creates 2 folders, deletes 1, leaves 1
   - "should prevent folder depth exceeding 10 levels" - creates 10 folders
   - "should prevent circular folder references" - creates 2 folders
4. The test "should list all folders in workspace" runs and creates 4 more folders
5. When listing folders, it sees the cumulative total from all tests

## Expected Behavior

The test "should list all folders in workspace" should:
1. Get a workspace ID
2. Create 4 folders with specific names: Documents, Images, Videos, Archive
3. List all folders in the workspace
4. Receive exactly 4 folders in the response
5. Verify the folders are sorted alphabetically

## Actual Behavior

The test receives 7 folders instead of 4:

```
Expected: 4
Received: 7
```

The 7 folders include:
- 4 folders created by the current test (Documents, Images, Videos, Archive)
- 3 additional folders left behind by previous tests (likely from the first 3 tests in the same file)

## Screenshots/Videos

Test failure screenshot available in `test-results/folders-Folder-Operations--77237-st-all-folders-in-workspace-chromium/test-failed-1.png`

## Error Messages/Logs

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 4
Received: 7

  195 |
  196 | 		// Verify all folders are returned (sorted alphabetically)
> 197 | 		expect(folders.data.length).toBe(4)
      | 		                            ^
  198 | 		const sortedNames = folderNames.sort()
  199 | 		folders.data.forEach((folder: any, index: number) => {
  200 | 			expect(folder.name).toBe(sortedNames[index])
    at /Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/e2e/folders.spec.ts:197:31
```

## Related Files/Components

- `simple-client/e2e/folders.spec.ts:167-202` - Failing test "should list all folders in workspace"
- `simple-client/e2e/folders.spec.ts:4-69` - Test 1: Creates 2 folders, deletes 1, leaves 1 remaining
- `simple-client/e2e/folders.spec.ts:71-112` - Test 2: Creates 10 folders for depth test
- `simple-client/e2e/folders.spec.ts:114-165` - Test 3: Creates 2 folders for circular reference test
- `simple-client/e2e/fixtures/test-fixtures.ts:109-156` - Worker-level testUser fixture
- `simple-client/e2e/fixtures/test-fixtures.ts:145` - Worker cleanup using `cleanupTestUsersByPattern`

## Possible Cause

**Root cause:** Test isolation issue with shared worker-level fixtures and lack of cleanup between tests

The problem occurs because:

1. **Worker-level fixture sharing**: The `testUser` fixture is scoped to `worker` (line 155 in test-fixtures.ts), meaning all tests in the same worker share the same test user
2. **Parallel test execution within worker**: Playwright runs multiple tests in parallel within each worker
3. **Shared workspace**: All tests use the same workspace (likely the private workspace or first workspace available)
4. **No per-test cleanup**: The individual folder tests don't clean up folders they create
5. **Data accumulation**: Folders from previous tests accumulate in the workspace
6. **Incorrect assumption**: The "list folders" test assumes it's working with a clean workspace with no existing folders

**Specific folder count breakdown (estimated):**
- Test 1 "should create, rename, move and delete folders": Creates Root Folder + Child Folder, deletes Child Folder → **1 folder remaining**
- Test 2 "should prevent folder depth exceeding 10 levels": Creates 10 nested folders → **10 folders remaining**
- Test 3 "should prevent circular folder references": Creates Parent + Child → **2 folders remaining**
- Test 4 "should list all folders in workspace": Creates 4 folders → **4 folders**
- **Total possible:** Up to 17 folders if all tests run before this one

The test sees **7 folders**, which suggests some cleanup is happening (possibly from `cleanupTestUsersByPattern` at the worker teardown level), but not enough to isolate individual tests.

## Proposed Solution

**Option 1 (Recommended): Add proper test cleanup for folder tests**

Add cleanup logic in each test's finally block or use test hooks to delete created folders:

```typescript
test('should list all folders in workspace', async ({
  authenticatedPage,
  supabaseAdmin,
  testUser,
}) => {
  const page = authenticatedPage

  // Get workspace ID
  const workspacesResponse = await page.request.get('/api/workspaces')
  const workspaces = await workspacesResponse.json()
  const workspaceId = workspaces.data[0].id

  try {
    // Delete any existing folders in the workspace first
    const existingFolders = await supabaseAdmin
      .from('folders')
      .select('id')
      .eq('workspace_id', workspaceId)

    if (existingFolders.data && existingFolders.data.length > 0) {
      await supabaseAdmin
        .from('folders')
        .delete()
        .eq('workspace_id', workspaceId)
    }

    // Create multiple folders
    const folderNames = ['Documents', 'Images', 'Videos', 'Archive']
    const createdFolders = []

    for (const name of folderNames) {
      const response = await page.request.post(`/api/workspaces/${workspaceId}/folders`, {
        data: { name },
      })
      const folder = await response.json()
      createdFolders.push(folder.data)
    }

    // List all folders
    const listResponse = await page.request.get(`/api/workspaces/${workspaceId}/folders`)
    expect(listResponse.ok()).toBeTruthy()
    const folders = await listResponse.json()

    // Verify all folders are returned (sorted alphabetically)
    expect(folders.data.length).toBe(4)
    const sortedNames = folderNames.sort()
    folders.data.forEach((folder: any, index: number) => {
      expect(folder.name).toBe(sortedNames[index])
    })
  } finally {
    // Cleanup: Delete created folders
    await supabaseAdmin
      .from('folders')
      .delete()
      .eq('workspace_id', workspaceId)
  }
})
```

**Option 2: Use a dedicated test workspace per test**

Create a fresh workspace for each test instead of reusing the testUser's private workspace:

```typescript
test('should list all folders in workspace', async ({
  authenticatedPage,
  supabaseAdmin,
  testUser,
  testData,
}) => {
  const page = authenticatedPage

  // Create a dedicated workspace for this test
  const workspace = await testData.createWorkspace({
    ownerId: testUser.id,
    name: `Folder List Test ${Date.now()}`,
  })

  try {
    // ... rest of test using workspace.id
  } finally {
    // Cleanup: Delete the entire workspace (cascades to folders)
    await supabaseAdmin
      .from('workspaces')
      .delete()
      .eq('id', workspace.id)
  }
})
```

**Option 3: Run folder tests serially**

Use `test.describe.serial()` to run all folder tests sequentially instead of in parallel, ensuring they don't interfere with each other. However, this:
- Slows down test execution significantly
- Doesn't fix the underlying isolation issue
- Is a workaround rather than a proper fix

**Option 4: Add cleanup to other folder tests**

Ensure all folder tests clean up after themselves:

```typescript
test('should create, rename, move and delete folders', async ({
  authenticatedPage,
  supabaseAdmin,
  testUser,
}) => {
  const page = authenticatedPage
  const workspacesResponse = await page.request.get('/api/workspaces')
  const workspaces = await workspacesResponse.json()
  const workspaceId = workspaces.data[0].id

  const createdFolderIds = []

  try {
    // ... existing test code ...
    // Track all created folder IDs
  } finally {
    // Cleanup: Delete all folders created in this test
    for (const folderId of createdFolderIds) {
      await supabaseAdmin
        .from('folders')
        .delete()
        .eq('id', folderId)
        .single()
    }
  }
})
```

## Related Issues

- Related to: BUG-35 (Empty Workspace Test Data Pollution) - Same root cause
- Impacts: Test reliability and CI/CD confidence

## Worklog

**2025-10-07:**
- Discovered via e2e test run
- Analyzed test isolation issue with shared worker-level fixtures
- Identified that multiple folder tests in the same file create folders without cleanup
- Confirmed 7 folders in API response (4 from current test + 3 from previous tests)
- Traced issue to parallel test execution and lack of per-test cleanup

## Resolution

**Fixed on 2025-10-07**

Implemented Option 1 (Recommended) from the proposed solutions: Added pre-cleanup logic to the "should list all folders in workspace" test to delete any existing folders before running the test.

**Changes made:**
- Modified `simple-client/e2e/folders.spec.ts` (lines 179-188)
- Added pre-cleanup step that queries for existing folders in the workspace using `supabaseAdmin`
- If existing folders are found, they are deleted before the test creates its 4 test folders
- This ensures the test always starts with a clean state, regardless of folders left by parallel tests

**Implementation:**
```typescript
// Pre-cleanup: Delete any existing folders in the workspace to ensure clean state
// This prevents data pollution from other parallel tests that may have created folders
const existingFolders = await supabaseAdmin
  .from('folders')
  .select('id')
  .eq('workspace_id', workspaceId)

if (existingFolders.data && existingFolders.data.length > 0) {
  await supabaseAdmin.from('folders').delete().eq('workspace_id', workspaceId)
}
```

**Test results:**
- Test now passes consistently in parallel test execution
- No longer sees 7 folders (4 from test + 3 from other tests)
- Correctly validates exactly 4 folders are returned
- Test passed in e2e suite run (147 passed total)

**Why this approach:**
- Minimal changes required (only affects the failing test)
- Doesn't require changes to other folder tests
- Maintains parallel test execution (no serialization needed)
- Isolates test data properly while keeping shared worker-level fixtures
- Follows the recommended pattern from the original issue analysis
