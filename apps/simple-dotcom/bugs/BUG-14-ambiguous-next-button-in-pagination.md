# [BUG-14]: Ambiguous "Next" Button Selector in Member List Pagination

**Status:** Open
**Priority:** Low
**Estimate:** 1 hour
**Related Tests:** e2e/member-management.spec.ts:63

## Problem

The test cannot uniquely identify the pagination "Next" button because there are two buttons with the name "Next":
1. The pagination Next button
2. The Next.js Dev Tools button (with aria-label="Open Next.js Dev Tools")

This causes a Playwright strict mode violation.

## Error Details

```
Error: locator.click: Error: strict mode violation: getByRole('button', { name: 'Next' }) resolved to 2 elements:
    1) <button class="rounded-md border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
    2) <button id="next-logo" aria-label="Open Next.js Dev Tools" ...>Next</button>
```

## Root Cause

This is primarily a test issue rather than an application bug. The test uses `getByRole('button', { name: 'Next' })` which matches both:
- The pagination button
- The Next.js dev tools button (which should only appear in development)

The test needs to be more specific, OR the pagination button needs a unique identifier like a data-testid attribute.

## Expected Behavior

One of the following solutions:
1. Add a `data-testid` to the pagination Next button to make it uniquely identifiable
2. Update the test to use a more specific selector (e.g., based on the pagination container)
3. Ensure Next.js Dev Tools button is not present in test environment

## Affected Tests

- `e2e/member-management.spec.ts:63` - search and pagination work for large member lists

## Acceptance Criteria

- [ ] Pagination Next button can be uniquely identified
- [ ] Test can click the pagination Next button without ambiguity
- [ ] Test passes when run individually
