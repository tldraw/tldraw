# [BUG-46]: Workspace Settings Invitation Link Section Not Rendering

Date created: 2025-10-07
Date last updated: -
Date completed: -

**Consolidates:** BUG-36, BUG-37

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
- [x] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [ ] API
- [ ] Database
- [x] Testing
- [ ] Infrastructure

## Description

The workspace settings page (`/workspace/[workspaceId]/settings`) does not correctly render the invitation link management section. Tests attempting to interact with invitation link settings encounter page crashes or missing UI elements.

This affects multiple E2E tests:
- `invitation-links.spec.ts` > "owner can disable and enable invitation link"
- `invitation-links.spec.ts` > "owner can regenerate invitation link"

## Consolidated Issues

### BUG-36: "Enabled" Status Text Not Visible
When the settings page loads, the invitation link status should display "Enabled" or "Disabled" text, but this is not visible.
- Expected: "Status:" label with "Enabled" text
- Actual: "Status:" visible but "Enabled" not found

### BUG-37: Page Crashes When Accessing Invitation Settings
When attempting to read the invitation link URL from the readonly input field, the page/context/browser closes unexpectedly.
- Expected: Page remains stable, input field is accessible
- Actual: "Target page, context or browser has been closed" error

## Root Cause Analysis

Both issues point to the same root cause: the invitation link management section on the workspace settings page is either:
1. **Not implemented**: The UI component doesn't exist
2. **Not rendering**: Component exists but conditional logic prevents it from showing
3. **Crashing on render**: Component has a runtime error that causes page to crash
4. **Missing data**: API not providing invitation link data to the page

The page crash (BUG-37) is particularly concerning as it suggests either:
- JavaScript error causing the page to become unresponsive
- Navigation/redirect happening before UI renders
- Error boundary catching an error and redirecting
- Missing error handling for API failures

## Steps to Reproduce

### For "Enabled" Status Not Visible:
1. Create workspace with invitation link enabled in database
2. Navigate to `/workspace/[workspaceId]/settings`
3. Wait for "Status:" text to be visible
4. Look for "Enabled" text

### For Page Crash:
1. Create workspace with invitation link enabled in database
2. Navigate to `/workspace/[workspaceId]/settings`
3. Attempt to access `input[readonly]` element (should contain invite URL)
4. Page crashes before input can be accessed

## Expected Behavior

- Settings page loads and remains stable
- Invitation link section displays:
  - "Status:" label with "Enabled"/"Disabled" text
  - Readonly input field with full invitation URL
  - "Disable"/"Enable" toggle button
  - "Regenerate Link" button
- All elements are accessible and interactive
- No page crashes or unexpected closes

## Actual Behavior

- "Status:" label visible but "Enabled" text not found
- Page crashes when attempting to access input field
- Error: "Target page, context or browser has been closed"
- Tests timeout waiting for elements

## Investigation Steps

1. **Check if settings page exists**:
   - Verify route at `/workspace/[workspaceId]/settings`
   - Check for page component implementation

2. **Check for invitation link section**:
   - Search for invitation link management component
   - Verify it's imported and rendered on settings page

3. **Check API integration**:
   - Verify invitation link data is fetched from API
   - Check for error handling if API fails

4. **Check for JavaScript errors**:
   - Run tests in headed mode to see visual feedback
   - Check browser console for errors
   - Look for unhandled exceptions

5. **Check conditional rendering**:
   - Verify invitation section renders for workspace owners
   - Check if section is hidden behind feature flags or permissions

6. **Examine status text implementation**:
   - Check if status uses "Enabled"/"Disabled" or different text
   - Verify text rendering (could be in badge, span, div)

## Acceptance Criteria

- [ ] Settings page loads without crashing
- [ ] Invitation link section is visible for workspace owners
- [ ] Status displays "Enabled" or "Disabled" correctly
- [ ] Readonly input field with invitation URL is accessible
- [ ] "Regenerate Link" button is functional
- [ ] Enable/disable toggle works correctly
- [ ] All related E2E tests pass

## Related Files

- Workspace settings page (likely `simple-client/src/app/workspace/[workspaceId]/settings/page.tsx`)
- Invitation link management component
- `simple-client/e2e/invitation-links.spec.ts:125-256` - Failing tests
- Invitation link API endpoints (enable/disable/regenerate)

## Testing Requirements

- [x] E2E tests exist and are failing
- [ ] Manual testing required in headed mode
- [ ] Browser console logs needed
- [ ] Fix verification needed

## Implementation Notes

If the invitation link section is missing, it should include:

```typescript
// Status display
<div>
  <label>Status:</label>
  <span>Enabled</span> // or "Disabled"
</div>

// URL display
<input
  type="text"
  readOnly
  value={`${baseUrl}/invite/${inviteToken}`}
/>

// Actions
<button onClick={handleToggle}>
  {enabled ? 'Disable' : 'Enable'}
</button>
<button onClick={handleRegenerate}>
  Regenerate Link
</button>
```

## Notes

Screenshots available in test results:
- BUG-36: `test-results/invitation-links-Invitatio-4d4df--and-enable-invitation-link-chromium/test-failed-*.png`
- BUG-37: `test-results/invitation-links-Invitatio-7a591--regenerate-invitation-link-chromium/test-failed-*.png`

The page crash is a critical issue that needs immediate attention. Fix this before working on status text visibility.
