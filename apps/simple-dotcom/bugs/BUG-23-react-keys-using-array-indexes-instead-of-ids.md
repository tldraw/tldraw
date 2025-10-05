# BUG-09: React Keys Using Array Indexes Instead of Unique IDs

**Status**: New
**Severity**: Medium
**Category**: Code Quality / React Best Practices
**Date reported**: 2025-10-05

## Description

Multiple components use array indexes as React keys instead of unique identifiers (IDs). This violates React best practices and can cause rendering issues when items are reordered, updated, or when multiple items share the same name.

## Impact

- **Performance**: React cannot efficiently track components between re-renders
- **State management**: Component state may be incorrectly preserved when list order changes
- **Duplicate names**: When items have the same name (which is allowed in the system), React cannot distinguish between them
- **DOM reconciliation**: React may unnecessarily destroy and recreate DOM elements

## Affected Files

### 1. **dashboard-client.tsx:103** - ActionMenu items using index
```tsx
{items.map((item, index) => {
  if (item.divider) {
    return (
      <div key={index} className="border-t border-gray-100 dark:border-gray-700 my-1" />
    )
  }
  return (
    <button
      key={index}
      onClick={() => handleItemClick(item)}
      // ...
    />
  )
})}
```

**Location**: `simple-client/src/components/shared/ActionMenu.tsx:103-131`

**Issue**: Menu items use `index` as key instead of a unique identifier based on the item's properties.

**Fix Required**: Use `item.label` or create a composite key from item properties, or require items to have unique IDs.

---

### Current Compliant Files (Using Proper Keys)

These files are already using correct unique IDs as keys:

✅ **dashboard-client.tsx**: Uses `workspace.id`, `folder.id`, `doc.id`, `recent.id`
✅ **workspace-documents-client.tsx**: Uses `document.id`
✅ **workspace-members-client.tsx**: Uses `member.id`
✅ **workspace-browser-client.tsx**: Uses `doc.id`, `folder.id`
✅ **workspace-archive-client.tsx**: Uses `doc.id`
✅ **FolderTree.tsx**: Uses `folder.id`

## Steps to Reproduce

1. Open any component with an ActionMenu
2. Trigger rapid re-renders (e.g., by updating state frequently)
3. Observe potential incorrect rendering or state preservation

## Expected Behavior

All list items should use stable, unique identifiers as React keys:
- Documents should use `document.id`
- Folders should use `folder.id`
- Workspaces should use `workspace.id`
- Menu items should use `item.label` or a composite key

## Actual Behavior

ActionMenu component uses array indexes as keys, which are not stable when the list order changes or items are added/removed.

## Root Cause

The `ActionMenu` component (lines 103-131) maps over `items` array using `index` parameter as the key prop. This is a common anti-pattern in React.

## Possible Solution

**Option 1**: Use item label as key (if labels are unique)
```tsx
{items.map((item) => {
  if (item.divider) {
    return (
      <div key={`divider-${item.label || Math.random()}`} className="..." />
    )
  }
  return (
    <button
      key={item.label}
      onClick={() => handleItemClick(item)}
      // ...
    />
  )
})}
```

**Option 2**: Require unique IDs in ActionMenuItem interface
```tsx
export interface ActionMenuItem {
  id: string // Add required ID field
  label: string
  onClick: () => void
  // ...
}
```

**Option 3**: Create composite key from multiple properties
```tsx
{items.map((item, index) => {
  const key = item.label || `item-${index}`
  if (item.divider) {
    return <div key={`divider-${index}`} className="..." />
  }
  return <button key={key} onClick={() => handleItemClick(item)} />
})}
```

## Related Issues

None

## Testing Checklist

- [ ] Verify ActionMenu re-renders correctly when items change order
- [ ] Verify menu items with duplicate labels (if allowed) render correctly
- [ ] Test rapid state updates don't cause incorrect rendering
- [ ] Verify component state is not incorrectly preserved across re-renders
- [ ] Check all ActionMenu usages throughout the app

## Notes

This is a code quality issue that should be addressed to follow React best practices. While it may not cause immediate visible bugs, it can lead to subtle rendering issues and performance problems, especially in lists with dynamic content.

The majority of the codebase correctly uses unique IDs (workspace.id, document.id, etc.) as keys, so this is an isolated issue in the ActionMenu component.
