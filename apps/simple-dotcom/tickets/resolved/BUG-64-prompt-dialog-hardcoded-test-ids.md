# [BUG-64]: PromptDialog Has Hardcoded Test IDs Breaking Rename Tests

Date reported: 2025-10-09
Date last updated: 2025-10-09
Date resolved: 2025-10-09

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
- [x] High (Major feature broken, significant impact)
- [ ] Medium (Feature partially broken, workaround exists)
- [ ] Low (Minor issue, cosmetic)

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
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: Chrome (Playwright tests)
- OS: macOS
- Environment: local/test
- Affected version/commit: Before fix on 2025-10-09

## Description

The PromptDialog component had hardcoded `data-testid` attributes that worked for workspace creation but broke workspace rename tests. The component always used `data-testid="workspace-name-input"` and `data-testid="confirm-create-workspace"`, even when used for rename scenarios that expected different test IDs.

## Steps to Reproduce

1. Run workspace rename test: `e2e/workspace.spec.ts:184` (should rename a shared workspace)
2. Test tries to find `[data-testid="rename-workspace-input"]`
3. Test fails because PromptDialog uses `[data-testid="workspace-name-input"]`
4. Test tries to click `[data-testid="confirm-rename-workspace"]`
5. Test fails because PromptDialog uses `[data-testid="confirm-create-workspace"]`

## Expected Behavior

The PromptDialog component should accept optional props to customize test IDs:
- `inputTestId` for the input field
- `confirmButtonTestId` for the confirm button
- `cancelButtonTestId` for the cancel button

With sensible defaults that work for the most common use case (workspace creation).

## Actual Behavior

Test IDs are hardcoded in the component:

```typescript
<Input
    data-testid="workspace-name-input"
    // ...
/>
<Button
    data-testid="confirm-create-workspace"
    // ...
/>
```

This causes rename tests to fail because they look for:
- `[data-testid="rename-workspace-input"]`
- `[data-testid="confirm-rename-workspace"]`

## Error Messages/Logs

```
Test timeout of 60000ms exceeded.

Error: page.waitForSelector: Target page, context or browser has been closed
Call log:
  - waiting for locator('[data-testid="rename-workspace-input"]') to be hidden
  - locator not found (element doesn't exist with this test ID)
```

## Related Files/Components

- `simple-client/src/components/ui/prompt-dialog.tsx:16-32,47-49,95,112,120`
- `simple-client/src/app/dashboard/dashboard-client.tsx:506-508` (rename modal usage)
- `simple-client/e2e/workspace.spec.ts:221,224,306,307` (rename test selectors)

## Possible Cause

The PromptDialog was designed for a single use case (workspace creation) and test IDs were hardcoded. When the component was reused for workspace rename, the test IDs didn't match.

## Proposed Solution

1. Add optional test ID props to PromptDialog interface
2. Use props instead of hardcoded values
3. Provide sensible defaults that maintain backward compatibility
4. Update dashboard-client to pass custom test IDs for rename scenario

## Related Issues

- Part of BUG-58: Workspace creation UI not updating realtime
- Related to BUG-63: PromptDialog auto-close timing issue
- Caused workspace rename test failures

## Worklog

**2025-10-09:**
- Identified hardcoded test IDs in PromptDialog component
- Added optional test ID props to component interface
- Updated component to use configurable test IDs with defaults
- Updated dashboard rename modal to pass custom test IDs
- Verified all rename tests now pass

## Resolution

### 1. Extended PromptDialogProps interface

In `simple-client/src/components/ui/prompt-dialog.tsx:16-32`:

```typescript
export interface PromptDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description?: string
    label?: string
    defaultValue?: string
    placeholder?: string
    onConfirm: (value: string) => void | Promise<void>
    confirmText?: string
    cancelText?: string
    loading?: boolean
    validationError?: string
    inputTestId?: string          // NEW
    confirmButtonTestId?: string  // NEW
    cancelButtonTestId?: string   // NEW
}
```

### 2. Added default values in component signature

Lines 47-49:

```typescript
export function PromptDialog({
    // ... other props
    inputTestId = 'workspace-name-input',
    confirmButtonTestId = 'confirm-create-workspace',
    cancelButtonTestId = 'cancel-dialog',
}: PromptDialogProps) {
```

### 3. Used props instead of hardcoded values

Lines 95, 112, 120:

```typescript
<Input
    data-testid={inputTestId}  // Was: "workspace-name-input"
    // ...
/>

<Button
    data-testid={cancelButtonTestId}  // Was: "cancel-dialog"
    // ...
/>

<Button
    data-testid={confirmButtonTestId}  // Was: "confirm-create-workspace"
    // ...
/>
```

### 4. Updated dashboard rename modal

In `simple-client/src/app/dashboard/dashboard-client.tsx:571-573`:

```typescript
<PromptDialog
    // ... other props
    inputTestId="rename-workspace-input"
    confirmButtonTestId="confirm-rename-workspace"
    cancelButtonTestId="cancel-rename-workspace"
/>
```

**Test Results:**
- Workspace creation tests: 3/3 PASS ✅ (using default test IDs)
- Workspace rename tests: 3/3 PASS ✅ (using custom test IDs)
- Component is now reusable with proper test ID customization
