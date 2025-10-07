# BUG-51: Workspace Modal Validation Error Not Displayed on Empty Input

Date created: 2025-10-07
Date last updated: -
Date completed: -

## Status

- [x] Not Started
- [ ] In Progress
- [ ] Blocked
- [ ] Done

## Priority

- [x] P0 (MVP Required)
- [ ] P1 (Post-MVP)

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
- [ ] Testing
- [ ] Infrastructure

## Description

The create workspace modal is not displaying validation errors when the workspace name input is focused and blurred without entering any text. The test expects an element with `data-testid="validation-error"` to appear showing "Workspace name is required", but this element is not found.

## Failing Test

Test: `simple-client/e2e/workspace-modal-ux.spec.ts:39:6` - "should show validation errors inline"

Error location: `simple-client/e2e/workspace-modal-ux.spec.ts:57`

Expected behavior:
1. User focuses the workspace name input
2. User blurs the input without entering text
3. Validation error appears with message "Workspace name is required"
4. When user starts typing, the validation error disappears

Actual behavior:
- The validation error element is not found/not visible

## Acceptance Criteria

- [x] Validation error with `data-testid="validation-error"` is displayed when workspace name input is focused and blurred while empty
- [x] Error message reads "Workspace name is required"
- [x] Validation error clears when user starts typing valid input
- [x] Test `simple-client/e2e/workspace-modal-ux.spec.ts:39` passes

## Technical Details

### UI Components

The create workspace modal needs to:
- Add validation logic that triggers on blur events
- Display an error element with `data-testid="validation-error"`
- Show appropriate error message text
- Clear the error when valid input is provided

Likely component location: Look for create workspace modal component in simple-client

### Testing Requirements

- [x] E2E test already exists and should pass after fix

## Related Documentation

- Test file: simple-client/e2e/workspace-modal-ux.spec.ts:39-63
- Related to BUG-02 fixes (as indicated by test suite name)

## Notes

This is part of the "Workspace Modal UX (BUG-02 Fixes)" test suite. The other 3 tests in this suite pass:
- ✅ should handle keyboard shortcuts in create workspace modal
- ✅ should prevent duplicate workspace names
- ✅ should keep modal open during request and handle errors

## Estimated Complexity

- [x] Small (< 1 day)
- [ ] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

2025-10-07: Bug identified via e2e test run. Validation error element not rendering on blur of empty input.

## Open questions

- Where is the create workspace modal component located?
- Is there existing validation logic that needs to be connected, or does it need to be implemented from scratch?
