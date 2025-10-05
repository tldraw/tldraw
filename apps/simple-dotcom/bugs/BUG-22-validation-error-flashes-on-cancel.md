# BUG-08: Validation Error Flashes When Clicking Cancel on Create Modals

**Status**: New
**Severity**: Low
**Category**: UI/UX - Form Validation
**Date reported**: 2025-10-05

## Description

When the "Create Document" or "Create Workspace" modal is open with an empty input field, clicking the "Cancel" button briefly flashes a validation error message. This happens because clicking Cancel blurs the input field, which triggers the `onBlur` validation handler that shows "Document name is required" or "Workspace name is required" error before the modal closes.

The validation error should only appear when the user attempts to submit the form (clicks Create button), not when they blur the input field by clicking Cancel or clicking outside the input.

## Steps to Reproduce

1. Open the Dashboard
2. Click "Create Workspace" or "Create Document" button
3. Leave the input field empty (or enter text and then delete it)
4. Click the "Cancel" button
5. Observe a brief flash of red error text/border before the modal closes

**Expected**: No validation error should appear when clicking Cancel
**Actual**: Validation error briefly flashes visible before modal closes

## Visual Behavior

The error flash occurs because:
1. User clicks "Cancel" button
2. Input loses focus (blur event fires)
3. `onBlur` handler sets validation error
4. Error message and red border appear
5. Modal closes (via `onClick` handler)
6. Error message disappears with modal

This creates an undesirable "flashing" effect that feels like a UI bug.

## Technical Analysis

### Root Cause

All three affected modals use an `onBlur` validation pattern that triggers on **any** blur event, not just when the user is attempting to submit:

**dashboard-client.tsx (Create Document - lines 799-803)**:
```typescript
onBlur={() => {
  if (!newDocumentName.trim()) {
    setValidationError('Document name is required')
  }
}}
```

**dashboard-client.tsx (Create Workspace - lines 671-676)**:
```typescript
onBlur={() => {
  // Show validation on blur if empty
  if (!newWorkspaceName.trim()) {
    setValidationError('Workspace name is required')
  }
}}
```

**workspace-browser-client.tsx (Create Document - lines 389-393)**:
```typescript
onBlur={() => {
  if (!newDocumentName.trim()) {
    setValidationError('Document name is required')
  }
}}
```

### Affected Files

- `simple-client/src/app/dashboard/dashboard-client.tsx`
  - Create Document modal: lines 792-837 (onBlur at 799-803)
  - Create Workspace modal: lines 663-710 (onBlur at 671-676)

- `simple-client/src/app/workspace/[workspaceId]/workspace-browser-client.tsx`
  - Create Document modal: lines 382-427 (onBlur at 389-393)

## Validation Requirements (from user description)

- **When to show validation errors**: Only when user clicks "Create" button with invalid input
- **Invalid values**:
  - Empty/blank input
  - Excessively long input (though no max length is currently enforced)
- **Valid edge cases**: Duplicate names are acceptable (no uniqueness validation needed)

## Possible Solutions

### Option 1: Remove `onBlur` Validation (Recommended)

Remove the `onBlur` handler entirely and only validate when the Create button is clicked. The Create button is already disabled when the input is empty (`disabled={actionLoading || !newDocumentName.trim()}`), providing visual feedback.

**Changes needed**:
1. Remove `onBlur` handler from all three input fields
2. Keep validation in the create handlers (`handleCreateDocument`, `handleCreateWorkspace`)
3. The existing `disabled` state on the Create button provides sufficient UX

**Pros**:
- Simplest fix
- Prevents error flash
- Still validates on submit
- Create button disabled state provides visual feedback

**Cons**:
- No validation feedback until user clicks Create (but this is the requested behavior)

### Option 2: Track Submit Attempt State

Add a "submit attempted" flag that only enables validation after the user has tried to submit once:

```typescript
const [submitAttempted, setSubmitAttempted] = useState(false)

// In onBlur:
onBlur={() => {
  if (submitAttempted && !newDocumentName.trim()) {
    setValidationError('Document name is required')
  }
}}

// In create handler:
const handleCreateDocument = async () => {
  setSubmitAttempted(true)
  if (!newDocumentName.trim()) {
    setValidationError('Document name is required')
    return
  }
  // ... rest of create logic
}
```

**Pros**:
- Validates on blur after first submit attempt
- More progressive disclosure of validation

**Cons**:
- More complex state management
- May be overengineered for this use case

### Option 3: Validate on Create Button Click Only

Move all validation logic to the create button handler and remove `onBlur` validation:

```typescript
const handleCreateDocument = async () => {
  if (!newDocumentName.trim()) {
    setValidationError('Document name is required')
    return
  }

  // Add max length validation
  if (newDocumentName.length > 255) {
    setValidationError('Document name is too long (max 255 characters)')
    return
  }

  // ... rest of create logic
}
```

**Pros**:
- Matches user expectations exactly
- Clear validation timing
- Easy to add additional validation rules (max length)

**Cons**:
- No validation feedback until submit attempt

## Recommended Solution

**Option 1 (Remove onBlur)** is recommended because:
1. It's the simplest fix
2. The Create button's disabled state already provides visual feedback
3. Matches the user's expected behavior exactly
4. Reduces cognitive load (no error message until user attempts action)

## Implementation Checklist

- [ ] Remove `onBlur` handler from Create Document modal in `dashboard-client.tsx`
- [ ] Remove `onBlur` handler from Create Workspace modal in `dashboard-client.tsx`
- [ ] Remove `onBlur` handler from Create Document modal in `workspace-browser-client.tsx`
- [ ] Verify validation still occurs in create handlers when form is submitted
- [ ] Consider adding max length validation (e.g., 255 characters) in create handlers
- [ ] Test that Cancel button no longer shows error flash
- [ ] Test that empty submission still shows appropriate error

## Impact

- **User Experience**: Minor annoyance; the error flash is brief but noticeable and feels like a bug
- **Functionality**: No functional impact; validation still works correctly
- **Workaround**: User can ignore the brief flash, or enter a value before canceling

## Notes

This pattern appears to have been copied across multiple modals. The fix should be applied consistently to all three locations. The Rename Workspace modal (lines 717-724 in `dashboard-client.tsx`) does not have this issue as it doesn't include an `onBlur` validation handler.
