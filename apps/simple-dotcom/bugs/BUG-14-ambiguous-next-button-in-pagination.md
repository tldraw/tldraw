# [BUG-14]: Ambiguous "Next" Button Selector in Member List Pagination

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
- [ ] High (Major feature broken, significant impact)
- [ ] Medium (Feature partially broken, workaround exists)
- [x] Low (Minor issue, cosmetic)

## Category

- [ ] Authentication
- [ ] Workspaces
- [ ] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [ ] API
- [ ] Database
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: All
- OS: All
- Environment: local/test
- Affected version/commit: Current

## Description

The test cannot uniquely identify the pagination "Next" button because there are two buttons with the name "Next":
1. The pagination Next button
2. The Next.js Dev Tools button (with aria-label="Open Next.js Dev Tools")

This causes a Playwright strict mode violation.

## Steps to Reproduce

1. Run e2e test: `e2e/member-management.spec.ts`
2. Navigate to test "search and pagination work for large member lists"
3. Observe strict mode violation when test attempts to click Next button

## Expected Behavior

The test should be able to uniquely identify and click the pagination Next button without ambiguity.

## Actual Behavior

The test fails with a strict mode violation because two buttons match the selector `getByRole('button', { name: 'Next' })`.

## Screenshots/Videos

N/A

## Error Messages/Logs

```
Error: locator.click: Error: strict mode violation: getByRole('button', { name: 'Next' }) resolved to 2 elements:
    1) <button class="rounded-md border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
    2) <button id="next-logo" aria-label="Open Next.js Dev Tools" ...>Next</button>
```

## Related Files/Components

- `e2e/member-management.spec.ts:63` - search and pagination work for large member lists
- Pagination component (Next button)

## Possible Cause

This is primarily a test issue rather than an application bug. The test uses `getByRole('button', { name: 'Next' })` which matches both:
- The pagination button
- The Next.js dev tools button (which should only appear in development)

The test needs to be more specific, OR the pagination button needs a unique identifier like a data-testid attribute.

## Proposed Solution

One of the following solutions:
1. Add a `data-testid` to the pagination Next button to make it uniquely identifiable
2. Update the test to use a more specific selector (e.g., based on the pagination container)
3. Ensure Next.js Dev Tools button is not present in test environment

Acceptance criteria:
- [x] Pagination Next button can be uniquely identified
- [x] Test can click the pagination Next button without ambiguity
- [x] Test passes when run individually

## Related Issues

- Related to: None

## Worklog

**2025-10-05:**
- Bug identified during test execution
- Updated test selector to filter for Next button within pagination container
- Test now passes without ambiguity
- Bug resolved

## Resolution

**Resolution approach:** Updated test selector to be more specific by filtering for buttons within the pagination container, avoiding conflict with Next.js Dev Tools button.

The test now uses a more precise selector that targets the pagination Next button specifically, ensuring no ambiguity with other buttons on the page.
