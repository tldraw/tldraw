# BUG-06: Workspace Name Not Visible After Creation

**Status:** Open
**Priority:** High
**Estimate:** 2 hours
**Related Tests:** e2e/document-crud.spec.ts:197

## Problem

When creating a new workspace via the UI, after clicking the confirm button, the workspace name is not visible on the resulting page. The test expects the workspace name to appear (likely in a header or title), but it times out waiting for it.

## Error Details

```
Error: expect(locator).toBeVisible() failed

Locator:  getByText('Archive Test 1759691390609')
Expected: visible
Received: <element(s) not found>
Timeout:  10000ms
```

## Test Flow

1. Click create workspace button (`[data-testid="create-workspace-button"]`)
2. Fill workspace name input (`[data-testid="workspace-name-input"]`)
3. Click confirm (`[data-testid="confirm-create-workspace"]`)
4. **FAILS**: Expect workspace name to be visible on page

## Root Cause

After successful workspace creation, the user is redirected to the workspace page, but the workspace name is not being displayed in the UI. This could be:
- Missing workspace name in the header/title component
- Incorrect routing after workspace creation
- UI component not rendering the workspace name
- Data not being passed to the component that should display the name

## Expected Behavior

After creating a workspace, the workspace name should be clearly visible on the workspace page (likely in a header, breadcrumb, or title area).

## Affected Tests

- `e2e/document-crud.spec.ts:197` - archived documents do not appear in active lists

## Acceptance Criteria

- [ ] Workspace name is visible after creation
- [ ] Test passes when run individually
