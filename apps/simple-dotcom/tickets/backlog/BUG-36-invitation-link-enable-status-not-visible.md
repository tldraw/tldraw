# [BUG-36]: Invitation Link "Enabled" Status Not Visible on Settings Page

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
- [x] P1 (High - Should Fix Soon)
- [ ] P2 (Medium - Normal Priority)
- [ ] P3 (Low - Nice to Have)

## Category

- [ ] Authentication
- [x] Workspaces
- [ ] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [ ] API
- [ ] Database
- [x] Testing
- [ ] Infrastructure

## Description

When navigating to workspace settings page (`/workspace/[id]/settings`) after creating an invitation link via the database, the "Enabled" status text is not visible on the page. The test expects to see "Status:" followed by "Enabled" text, but "Enabled" is not found.

This affects the E2E test: `invitation-links.spec.ts` > "owner can disable and enable invitation link"

## Steps to Reproduce

1. Create a workspace with an invitation link enabled in the database
2. Navigate to `/workspace/[workspaceId]/settings`
3. Wait for "Status:" text to be visible
4. Look for "Enabled" text

## Expected Behavior

- "Status:" text should be visible
- "Enabled" text should be visible next to the status label
- The invitation link URL should be displayed in a readonly input

## Actual Behavior

- "Status:" text is visible
- "Enabled" text is NOT visible (element not found)
- Test fails with timeout waiting for "Enabled" text

## Error Message

```
Error: expect(locator).toBeVisible() failed

Locator:  getByText('Enabled')
Expected: visible
Received: <element(s) not found>
Timeout:  5000ms
```

## Potential Causes

1. The invitation link settings UI component may not be rendering the status correctly
2. The text content might be different (e.g., "Active" instead of "Enabled")
3. The component might be using a different HTML structure (e.g., badge, label)
4. The invitation link data might not be loading properly from the API
5. There might be a race condition where the component renders before the data is loaded

## Acceptance Criteria

- [ ] "Enabled" status text is visible when invitation link is enabled
- [ ] "Disabled" status text is visible when invitation link is disabled
- [ ] Status text is consistent with API response
- [ ] E2E test passes without modifications

## Related Files

- `e2e/invitation-links.spec.ts:125-191` - Failing test
- Workspace settings page component (likely in `src/app/workspace/[workspaceId]/settings/`)
- Invitation link settings component

## Testing Requirements

- [x] E2E test exists and is failing
- [ ] Manual testing required
- [ ] Fix verification needed

## Notes

Screenshots available in test results:
- `test-results/invitation-links-Invitatio-4d4df--and-enable-invitation-link-chromium/test-failed-1.png`
- `test-results/invitation-links-Invitatio-4d4df--and-enable-invitation-link-chromium/test-failed-2.png`

Check the actual UI implementation to see what text/structure is being used for the status display.
