# [BUG-37]: Page/Context Closed When Regenerating Invitation Link

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

When attempting to regenerate an invitation link on the workspace settings page, the page/context/browser closes unexpectedly, causing a test timeout. The test cannot retrieve the original invitation link URL from the readonly input field because the target has been closed.

This affects the E2E test: `invitation-links.spec.ts` > "owner can regenerate invitation link"

## Steps to Reproduce

1. Create a workspace with an enabled invitation link in the database
2. Navigate to `/workspace/[workspaceId]/settings`
3. Wait for invitation link section to load
4. Attempt to get the input value from the readonly input field containing the invitation URL

## Expected Behavior

- The settings page should remain open and functional
- The readonly input field with the invitation URL should be accessible
- The test should be able to read the original URL value
- After clicking "Regenerate Link", a new URL should be generated

## Actual Behavior

- The page, context, or browser closes unexpectedly
- Test times out after 30 seconds
- Error: "Target page, context or browser has been closed"
- Cannot access the input field to retrieve the URL

## Error Message

```
Test timeout of 30000ms exceeded.

Error: locator.inputValue: Target page, context or browser has been closed
Call log:
  - waiting for locator('input[readonly]').first()

  237 | 		// Get original URL
  238 | 		const inviteInput = page.locator('input[readonly]').first()
> 239 | 		const originalUrl = await inviteInput.inputValue()
```

## Potential Causes

1. **JavaScript error/crash**: The settings page might have a JavaScript error that crashes the page
2. **Navigation issue**: The page might be automatically redirecting or navigating away
3. **Missing invitation link**: If no invitation link exists, the page might redirect or error
4. **Permission check failure**: The page might detect the user doesn't have permission and redirect
5. **API error**: An unhandled API error might cause the page to crash or redirect
6. **React error boundary**: An unhandled error in React might trigger an error boundary that closes/redirects

## Acceptance Criteria

- [ ] Settings page remains stable and accessible throughout the test
- [ ] Readonly input field with invitation URL is accessible and readable
- [ ] Page does not close, crash, or redirect unexpectedly
- [ ] Regenerate functionality works correctly
- [ ] E2E test passes without timeout

## Related Files

- `e2e/invitation-links.spec.ts:193-256` - Failing test
- Workspace settings page component
- Invitation link management component
- Invitation link regenerate API endpoint

## Testing Requirements

- [x] E2E test exists and is failing
- [ ] Manual testing required
- [ ] Browser console logs needed to identify crash cause
- [ ] Fix verification needed

## Investigation Steps

1. Check browser console logs for JavaScript errors
2. Inspect network tab for failed API requests
3. Verify the settings page route and component are implemented
4. Check if invitation link data is being loaded correctly
5. Look for error boundaries or redirect logic in the settings page
6. Verify the readonly input selector is correct (`input[readonly]`)
7. Test manually in headed mode to see what happens visually

## Notes

Screenshots available in test results:
- `test-results/invitation-links-Invitatio-7a591--regenerate-invitation-link-chromium/test-failed-1.png`
- `test-results/invitation-links-Invitatio-7a591--regenerate-invitation-link-chromium/test-failed-2.png`
- Error context available: `test-results/invitation-links-Invitatio-7a591--regenerate-invitation-link-chromium/error-context.md`

This is likely related to BUG-36, as both issues involve the invitation link settings page not displaying correctly.
