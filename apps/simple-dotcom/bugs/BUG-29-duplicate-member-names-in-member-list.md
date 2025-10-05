# [BUG-29]: Duplicate Member Names Displayed in Member Management Page

Date reported: 2025-10-05
Date last updated: 2025-10-05
Date resolved:

## Status

- [x] New
- [ ] Investigating
- [ ] In Progress
- [ ] Blocked
- [ ] Resolved
- [ ] Cannot Reproduce
- [ ] Won't Fix

## Severity

- [ ] Critical (System down, data loss, security)
- [ ] High (Major feature broken, significant impact)
- [x] Medium (Feature partially broken, workaround exists)
- [ ] Low (Minor issue, cosmetic)

## Category

- [ ] Authentication
- [x] Workspaces
- [ ] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [ ] UI/UX
- [ ] API
- [ ] Database
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: All
- OS: All
- Environment: local/staging/production
- Affected version/commit: simple-dotcom branch

## Description

The member management page is displaying duplicate entries for member names. When Playwright tries to find a specific member by text, it finds 2 elements instead of 1, causing a "strict mode violation".

## Steps to Reproduce

1. Create workspace with owner and member users
2. Navigate to workspace members page
3. **FAILS**: Test tries to verify "Owner User" is visible, but finds 2 elements instead of 1

## Expected Behavior

Each member should appear exactly once in the member list. When searching for a member by their name, Playwright should find exactly one matching element.

## Actual Behavior

What actually happens:

## Screenshots/Videos

N/A

## Error Messages/Logs

```
Error: expect.toBeVisible: Error: strict mode violation: getByText('Owner User') resolved to 2 elements:
    1) <p class="font-medium">…</p> aka getByText('Owner User(You)').first()
    2) <p class="font-medium">…</p> aka getByText('Owner User(You)').nth(1)
```

## Related Files/Components

- `e2e/member-management.spec.ts:5` - owner can view and remove workspace members

## Possible Cause

The member management page is rendering duplicate elements for member names. This could be due to:
- Component being rendered twice
- Data being duplicated in the list
- Incorrect key props causing React to render duplicates
- CSS/layout issue where the same element is displayed twice

## Proposed Solution

Suggested fix or approach to resolve the bug.

## Related Issues

- Related to: [ticket/bug numbers]

## Worklog

**2025-10-05:**
- Bug report created
- Initial analysis performed

## Resolution

Description of how the bug was fixed, or why it was closed without fixing.
