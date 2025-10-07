# [BUG-23]: React Keys Using Array Indexes Instead of Unique IDs

Date reported: 2025-10-05
Date last updated: 2025-10-07
Date resolved: 2025-10-07

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
- [ ] High (Major feature broken, significant impact)
- [x] Medium (Feature partially broken, workaround exists)
- [ ] Low (Minor issue, cosmetic)

## Category

- [ ] Authentication
- [x] Workspaces
- [x] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [x] API
- [ ] Database
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: All
- OS: All
- Environment: local/staging/production
- Affected version/commit: simple-dotcom branch

## Description

Multiple components use array indexes as React keys instead of unique identifiers (IDs). This violates React best practices and can cause rendering issues when items are reordered, updated, or when multiple items share the same name.

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

## Screenshots/Videos

N/A

## Error Messages/Logs

```
No specific error logs available
```

## Related Files/Components

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

## Possible Cause

The `ActionMenu` component (lines 103-131) maps over `items` array using `index` parameter as the key prop. This is a common anti-pattern in React.

## Proposed Solution

Suggested fix or approach to resolve the bug.

## Related Issues

- Related to: [ticket/bug numbers]

## Worklog

**2025-10-05:**
- Bug report created
- Initial analysis performed

**2025-10-07:**
- Fixed ActionMenu component to use unique keys
- Changed from `key={index}` to `key={item.label}` for menu items
- Used `key={`divider-${index}`}` for dividers (acceptable as they are stateless separators)
- Verified all ActionMenu usages have unique labels within their respective menus
- Type checking passed successfully

## Resolution

**Fixed** - Updated `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/src/components/shared/ActionMenu.tsx` to use proper React keys:

1. **Menu items** now use `key={item.label}` instead of `key={index}` (line 118)
2. **Dividers** now use `key={`divider-${index}`}` instead of `key={index}` (line 112)

**Rationale for key strategy:**
- Menu item labels are unique within each menu (verified in DocumentActions and FolderActions components)
- Labels are stable and don't change unless the menu structure changes
- This follows React best practices for list item keys
- Dividers are stateless UI elements, so a prefixed index is acceptable

The fix ensures proper React reconciliation and prevents potential rendering issues when menu items are dynamically updated or reordered.
