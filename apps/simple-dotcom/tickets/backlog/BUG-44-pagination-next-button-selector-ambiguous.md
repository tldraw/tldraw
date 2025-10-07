# [BUG-44]: Pagination "Next" Button Selector Ambiguous with Next.js Dev Tools

Date created: 2025-10-07
Date last updated: -
Date completed: -

## Status

- [x] Not Started
- [ ] In Progress
- [ ] Blocked
- [ ] Done

## Priority

- [ ] P0 (Critical - Blocking)
- [ ] P1 (High - Should Fix Soon)
- [x] P2 (Medium - Normal Priority)
- [ ] P3 (Low - Nice to Have)

## Category

- [ ] Authentication
- [x] Workspaces
- [ ] Documents
- [ ] Folders
- [x] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [ ] API
- [ ] Database
- [x] Testing
- [ ] Infrastructure

## Description

When running E2E tests for member management pagination, the test fails because the selector `getByRole('button', { name: 'Next' })` matches two elements:
1. The actual pagination "Next" button
2. The Next.js Dev Tools button (with aria-label "Open Next.js Dev Tools")

This causes a strict mode violation in Playwright, preventing the test from clicking the correct pagination button.

This affects the E2E test:
- `member-management.spec.ts` > "Member Management" > "search and pagination work for large member lists"

## Steps to Reproduce

1. Run the member management tests with Next.js dev mode enabled
2. Navigate to members page with 16+ members (requiring pagination)
3. Attempt to click the "Next" button for pagination
4. Playwright finds two matching buttons and fails

## Expected Behavior

- The test should uniquely identify the pagination "Next" button
- Clicking "Next" should navigate to page 2 of members
- Test should not be affected by Next.js Dev Tools
- Selector should be specific enough to avoid conflicts

## Actual Behavior

- Playwright finds 2 elements matching the selector
- Error: "strict mode violation: getByRole('button', { name: 'Next' }) resolved to 2 elements"
- Test fails and cannot proceed with pagination testing
- Elements found:
  1. `<button class="rounded-md border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>` (pagination)
  2. `<button id="next-logo" ... aria-label="Open Next.js Dev Tools">...</button>` (dev tools)

## Error Message

```
Error: locator.click: Error: strict mode violation: getByRole('button', { name: 'Next' }) resolved to 2 elements:
    1) <button class="rounded-md border px-3 py-1 ...">Next</button>
    2) <button id="next-logo" aria-label="Open Next.js Dev Tools" ...>...</button>

  109 | 		await expect(page.getByText('Showing 1 to 10')).toBeVisible()
  110 |
> 111 | 		await page.getByRole('button', { name: 'Next' }).click()
```

## Potential Causes

1. **Selector too generic**: Using role and text only is not specific enough
2. **Next.js Dev Tools interference**: Dev tools button has similar characteristics
3. **Missing test id**: Pagination buttons don't have data-testid attributes
4. **Dev mode running**: Tests run in dev mode where Next.js tools are active

## Acceptance Criteria

- [ ] Pagination "Next" button has unique, stable selector
- [ ] Test can click Next button without ambiguity
- [ ] Pagination works correctly (navigates to page 2)
- [ ] Test passes reliably in both dev and production modes
- [ ] E2E test passes

## Related Files

- `e2e/member-management.spec.ts:60-116` - Failing test (line 111)
- Member management pagination component
- Pagination controls component

## Recommended Fixes

**Option 1: Add data-testid to pagination buttons** (Preferred)
```tsx
// In pagination component
<button data-testid="pagination-next" ...>Next</button>
<button data-testid="pagination-previous" ...>Previous</button>

// In test
await page.click('[data-testid="pagination-next"]')
```

**Option 2: Use more specific selector**
```typescript
// Filter to exclude Next.js dev tools button
await page.getByRole('button', { name: 'Next', exact: true })
  .filter({ hasNotText: 'Dev Tools' })
  .click()

// Or use class-based selector
await page.locator('button.rounded-md:has-text("Next")').click()
```

**Option 3: Disable Next.js Dev Tools in tests**
```typescript
// In playwright.config.ts or test setup
process.env.NODE_ENV = 'production'
// or
process.env.__NEXT_DISABLE_DEV_OVERLAY = 'true'
```

## Testing Requirements

- [x] E2E test exists and is failing
- [ ] Manual testing required
- [ ] Fix verification needed

## Notes

This is a test flakiness issue rather than a functional bug. The pagination likely works correctly in the UI, but the test cannot interact with it reliably due to selector ambiguity.

The recommended fix is to add data-testid attributes to pagination buttons for stable, unique identification in tests.

Screenshots available in test results:
- `test-results/member-management-Member-M-ee247-work-for-large-member-lists-chromium/test-failed-1.png`
- `test-results/member-management-Member-M-ee247-work-for-large-member-lists-chromium/test-failed-2.png`

## Related Issues

This pattern should be checked across all pagination components in the app to prevent similar issues in other tests.
