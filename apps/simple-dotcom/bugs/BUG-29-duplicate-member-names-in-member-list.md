# BUG-13: Duplicate Member Names Displayed in Member Management Page

**Status:** Open
**Priority:** Medium
**Estimate:** 2 hours
**Related Tests:** e2e/member-management.spec.ts:5

## Problem

The member management page is displaying duplicate entries for member names. When Playwright tries to find a specific member by text, it finds 2 elements instead of 1, causing a "strict mode violation".

## Error Details

```
Error: expect.toBeVisible: Error: strict mode violation: getByText('Owner User') resolved to 2 elements:
    1) <p class="font-medium">…</p> aka getByText('Owner User(You)').first()
    2) <p class="font-medium">…</p> aka getByText('Owner User(You)').nth(1)
```

## Test Flow

1. Create workspace with owner and member users
2. Navigate to workspace members page
3. **FAILS**: Test tries to verify "Owner User" is visible, but finds 2 elements instead of 1

## Root Cause

The member management page is rendering duplicate elements for member names. This could be due to:
- Component being rendered twice
- Data being duplicated in the list
- Incorrect key props causing React to render duplicates
- CSS/layout issue where the same element is displayed twice

## Expected Behavior

Each member should appear exactly once in the member list. When searching for a member by their name, Playwright should find exactly one matching element.

## Affected Tests

- `e2e/member-management.spec.ts:5` - owner can view and remove workspace members

## Acceptance Criteria

- [ ] Each member appears exactly once in the member list
- [ ] No duplicate elements rendered on the members page
- [ ] Test can successfully locate members by their names
- [ ] Test passes when run individually
