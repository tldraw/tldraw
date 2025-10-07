# [BUG-33]: Create Document Modal Pre-fills Name, Breaking Validation Test

Date reported: 2025-10-07
Date last updated: 2025-10-07
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
- [ ] Workspaces
- [x] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [ ] API
- [ ] Database
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: Chromium (Playwright)
- OS: macOS 14.6.0
- Environment: local
- Affected version/commit: Current (8ee7ad262)

## Description

The document creation modal automatically pre-fills the name field with "New Document" when opened, which means the "Create" button is never disabled. This breaks the validation test that expects the button to be disabled when the name field is empty.

The test `validates document name is required` expects the following behavior:
1. Open create modal
2. Name field should be empty
3. Create button should be disabled
4. Fill in name → button becomes enabled
5. Clear name → button becomes disabled again

However, the actual behavior is:
1. Open create modal
2. Name field is pre-filled with "New Document"
3. Create button is enabled immediately

## Steps to Reproduce

1. Navigate to a workspace page
2. Click the "+ New Document" button
3. Observe the create document modal
4. Notice the name input is pre-filled with "New Document"
5. Notice the "Create" button is enabled

## Expected Behavior

The test expects the modal to open with an empty name field, requiring the user to provide a name before the Create button becomes enabled.

## Actual Behavior

The modal opens with "New Document" pre-filled in the name field, and the Create button is immediately enabled.

## Screenshots/Videos

Test failure screenshot shows the Create button is enabled when it should be disabled.

## Error Messages/Logs

```
Error: expect(locator).toBeDisabled() failed

Locator:  locator('[data-testid="confirm-create-document"]')
Expected: disabled
Received: enabled
Timeout:  5000ms

Call log:
  - Expect "toBeDisabled" with timeout 5000ms
  - waiting for locator('[data-testid="confirm-create-document"]')
    9 × locator resolved to <button data-testid="confirm-create-document" class="rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">Create</button>
      - unexpected value "enabled"


  75 | 			// Verify button is disabled when name is empty
  76 | 			const createButton = page.locator('[data-testid="confirm-create-document"]')
> 77 | 			await expect(createButton).toBeDisabled()
     | 			                           ^
  78 |
  79 | 			// Fill in a name and verify button is enabled
  80 | 			await page.fill('[data-testid="document-name-input"]', 'Valid Name')
```

## Related Files/Components

- `simple-client/src/app/workspace/[workspaceId]/workspace-browser-client.tsx:333-336` - Modal opening logic that pre-fills the name
- `simple-client/src/app/workspace/[workspaceId]/workspace-browser-client.tsx:435` - Button disabled state: `disabled={actionLoading || !newDocumentName.trim()}`
- `simple-client/e2e/document-ui-operations.spec.ts:57-92` - Failing test

## Possible Cause

The code intentionally pre-fills the document name with "New Document" when opening the modal (line 333):

```typescript
setNewDocumentName('New Document')
```

This was likely a UX decision to provide a default name, but it conflicts with the test's expectation that the user must provide a name before creating a document.

The button's disabled state is correctly implemented (`disabled={actionLoading || !newDocumentName.trim()}`), but since the field is pre-filled, `!newDocumentName.trim()` is always `false`.

## Proposed Solution

**Option 1 (Recommended)**: Update the test to match the actual UX behavior
- The test should expect the modal to open with "New Document" pre-filled
- Test should verify the button is enabled with the pre-filled name
- Test should clear the field and verify button becomes disabled
- This matches the current intentional UX design

**Option 2**: Change the UX to not pre-fill the name
- Set `setNewDocumentName('')` instead of `setNewDocumentName('New Document')`
- This would require users to always type a name
- Less convenient UX but stricter validation

**Option 3**: Keep pre-fill but select the text
- Keep the pre-fill behavior (which is already selecting the text on focus)
- Consider this a "suggested" name that users can easily replace
- Update test to account for this UX pattern

## Related Issues

- Related to: NAV-03A (Document UI Operations)

## Worklog

**2025-10-07:**
- Discovered via e2e test run
- Analyzed code and confirmed pre-fill is intentional
- Identified as test design mismatch vs actual UX behavior

## Resolution

Awaiting decision on whether this is a test issue or a UX issue.
