# E2E Tests

This directory contains end-to-end tests for the Simple tldraw app using Playwright.

## Setup

### Prerequisites

1. Node.js 20+
2. Yarn 4.x
3. Supabase project configured for testing

### Environment Variables

Create a `.env.local` file in the `simple-client` directory with:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

⚠️ **Important**: Use a dedicated test Supabase project, not your production or staging environment.

### Installation

```bash
# Install dependencies
yarn install

# Install Playwright browsers
npx playwright install
```

## Running Tests

```bash
# Run all tests (headless)
yarn test:e2e

# Run tests with UI
yarn test:e2e:ui

# Run tests in headed mode (see browser)
yarn test:e2e:headed

# Debug tests
yarn test:e2e:debug
```

## Test Structure

### Fixtures (`fixtures/test-fixtures.ts`)

Custom Playwright fixtures for:
- `testUser`: Automatically creates and cleans up test users
- `authenticatedPage`: Pre-authenticated page ready for testing protected routes
- `supabaseAdmin`: Admin client for test setup/teardown

### Test Suites

- **`auth.spec.ts`**: Authentication flows (signup, login, logout, password recovery)
- **`workspace.spec.ts`**: Basic dashboard access (comprehensive workspace tests deferred until UI is implemented)
- **`route-guards.spec.ts`**: Route protection and authorization checks

## CI/CD

Tests run automatically on:
- Push to `main` or `simple-dotcom` branches (when `apps/simple-dotcom/**` files change)
- Pull requests targeting `main` or `simple-dotcom` (when `apps/simple-dotcom/**` files change)

The workflow is located at `.github/workflows/simple-dotcom-e2e.yml` in the repository root.

### GitHub Secrets Required

- `SUPABASE_TEST_URL`: Test Supabase project URL
- `SUPABASE_TEST_SERVICE_ROLE_KEY`: Test Supabase service role key

## Test Coverage Notes

**Currently Implemented:**
- ✅ Full authentication flow coverage
- ✅ Route guard and session validation
- ✅ Basic dashboard access

**Deferred (UI Not Yet Implemented):**
- ⏭️ Workspace CRUD operations
- ⏭️ Workspace provisioning and listing
- ⏭️ Owner constraints and safeguards
- ⏭️ Private workspace access enforcement

These deferred tests are written and ready to be enabled as workspace features are built in tickets WS-01, WS-02, PERM-01, etc.

## Data Isolation Strategy

To ensure reliable test execution and prevent flaky tests, we implement comprehensive data isolation:

### Global Setup

Before any tests run, `e2e/global-setup.ts` cleans up leftover test data from previous runs by:
- Finding all users with emails matching `test-%` pattern
- Cascading deletion of all related data (workspaces, documents, folders, memberships, etc.)
- Logging detailed cleanup results

This ensures tests never inherit dirty state from:
- Failed or interrupted previous test runs
- Manual testing during development
- CI runs that didn't clean up properly

### Per-Test Isolation

Each test using the `testUser` fixture gets:

1. **Unique test user** with email: `test-w{worker}-t{test}-{counter}-{timestamp}-{random}@example.com`
2. **Automatic cleanup** after the test that deletes:
   - presence records
   - document_access_log entries
   - documents in owned workspaces
   - folders in owned workspaces
   - invitation_links for owned workspaces
   - workspace_members records
   - owned workspaces
   - the user record itself

3. **Failure on cleanup errors** - If cleanup fails, the test fails with detailed logging showing:
   - Which table(s) failed
   - Specific error messages
   - Counts of successfully deleted records

### Cleanup Utilities

Located in `e2e/fixtures/cleanup-helpers.ts`:

- **`cleanupUserData(supabase, userId)`** - Comprehensive cleanup for a single user
- **`cleanupTestUsersByPattern(supabase, pattern)`** - Bulk cleanup matching email pattern
- **`assertCleanupSuccess(result, context)`** - Validates and logs cleanup results

### Supabase RPC Function

The database includes a `cleanup_test_data(email_pattern)` RPC function for efficient bulk deletion:

```sql
SELECT cleanup_test_data('test-%');
```

This function can only be called with service role key and provides atomic deletion of all test data.

### Manual Database Reset

If needed, you can manually reset the test database:

```bash
# Option 1: Run global setup directly
npx tsx simple-client/e2e/global-setup.ts

# Option 2: Use Supabase SQL Editor
SELECT cleanup_test_data('test-%');
```

## Best Practices

1. **Isolation**: Each test creates its own test user with automatic comprehensive cleanup
2. **Stable Selectors**: Uses `data-testid` attributes for reliable element selection
3. **Fixtures**: Leverage fixtures for common setup patterns
4. **No Hardcoded Data**: Generate unique test data to avoid conflicts
5. **Cleanup**: Cleanup is automatic via fixtures and fails tests if unsuccessful

## Debugging

### View Test Results

After running tests, view the HTML report:

```bash
npx playwright show-report
```

### Debug a Specific Test

```bash
npx playwright test --debug -g "test name"
```

### Trace Viewer

Traces are captured on first retry. View them:

```bash
npx playwright show-trace trace.zip
```

## Writing New Tests

1. Import fixtures from `./fixtures/test-fixtures`
2. Use `data-testid` attributes for selectors
3. Clean up any created resources
4. Follow existing test patterns

Example:

```typescript
import { test, expect } from './fixtures/test-fixtures'

test.describe('Feature Name', () => {
  test('should do something', async ({ authenticatedPage }) => {
    const page = authenticatedPage

    // Your test code here
    await page.click('[data-testid="button"]')
    await expect(page.locator('[data-testid="result"]')).toBeVisible()
  })
})
```

## Troubleshooting

### Tests Fail with Auth Errors

- Verify Supabase environment variables are correct
- Ensure service role key has admin permissions
- Check test database is accessible

### Flaky Tests

- Check for race conditions
- Add proper wait conditions (`waitForURL`, `waitForSelector`)
- Ensure stable selectors using `data-testid`

### Slow Tests

- Run fewer browsers in parallel during development
- Use `.only` to run specific tests
- Skip unnecessary setup in isolated tests
