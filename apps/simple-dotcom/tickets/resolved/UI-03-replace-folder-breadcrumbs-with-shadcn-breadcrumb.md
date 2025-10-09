# UI-03: Replace FolderBreadcrumbs with shadcn/ui Breadcrumb

Date created: 2025-10-08
Date last updated: 2025-10-08
Date completed: 2025-10-08

## Status

- [ ] Not Started
- [ ] In Progress
- [ ] Blocked
- [x] Done

## Priority

- [ ] P0 (MVP Required)
- [x] P1 (Post-MVP)

## Category

- [ ] Authentication
- [ ] Workspaces
- [ ] Documents
- [x] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [ ] API
- [ ] Database
- [ ] Testing
- [ ] Infrastructure

## Description

Replace the custom `FolderBreadcrumbs` component with shadcn/ui's Breadcrumb component. This provides better accessibility, consistent styling, and reduced maintenance burden.

## Acceptance Criteria

- [x] shadcn Breadcrumb component installed (`npx shadcn@latest add breadcrumb`)
- [x] FolderBreadcrumbs refactored to use shadcn primitives
- [x] Breadcrumb navigation displays folder hierarchy correctly
- [x] Root/home breadcrumb shows "All Files" or custom label
- [x] Current folder highlighted appropriately
- [x] Click handlers work for navigation
- [x] Separator icons render correctly
- [x] Component supports dark mode
- [x] All existing usages work without changes

## Technical Details

### UI Components

**Install shadcn Breadcrumb:**
```bash
npx shadcn@latest add breadcrumb
```

**Refactor:**
- `src/components/folders/FolderBreadcrumbs.tsx` - Update to use shadcn Breadcrumb

**Pattern:**

```typescript
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export function FolderBreadcrumbs({ ... }) {
  const breadcrumbs = useMemo(() => {
    // Keep existing breadcrumb path logic
  }, [folders, currentFolderId])

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {showRoot && (
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => onFolderClick?.(null)}>
              {rootLabel}
            </BreadcrumbLink>
          </BreadcrumbItem>
        )}

        {breadcrumbs.map((folder, index) => (
          <Fragment key={folder.id}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {index === breadcrumbs.length - 1 ? (
                <BreadcrumbPage>{folder.name}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink onClick={() => onFolderClick?.(folder.id)}>
                  {folder.name}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
```

### Permissions/Security

No security implications.

## Dependencies

- shadcn Breadcrumb component (to be installed)

## Testing Requirements

- [x] Manual testing: Verify breadcrumbs render folder hierarchy
- [x] Manual testing: Verify clicking breadcrumbs navigates correctly
- [x] Manual testing: Verify root breadcrumb works
- [x] Manual testing: Verify current folder is highlighted
- [x] E2E tests: Update folder navigation tests if needed (no updates needed - component maintains same interface)

## Related Documentation

- Current component: `src/components/folders/FolderBreadcrumbs.tsx`
- shadcn Breadcrumb: https://ui.shadcn.com/docs/components/breadcrumb

## Notes

- Keep the existing breadcrumb path calculation logic
- Maintain support for custom root label
- Used in: workspace browser, folder picker
- Consider adding ellipsis for very deep folder hierarchies

## Estimated Complexity

- [x] Small (< 1 day)
- [ ] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

### 2025-10-08
- Started implementation
- Reviewed current FolderBreadcrumbs component implementation
- Installed shadcn Breadcrumb component successfully
- Refactored FolderBreadcrumbs.tsx to use shadcn primitives:
  - Replaced custom nav/button structure with Breadcrumb components
  - Used BreadcrumbLink for clickable items
  - Used BreadcrumbPage for current folder (last item)
  - Used BreadcrumbSeparator with default ChevronRight icon
  - Maintained existing breadcrumb path calculation logic
  - Added cursor-pointer class to BreadcrumbLink for better UX
  - Root breadcrumb shows as BreadcrumbPage when at root, BreadcrumbLink otherwise
- Verified no linting errors in the component
- All acceptance criteria met

## Open questions

- Should we add ellipsis for deep folder hierarchies (e.g., > 5 levels)?
- Should we add tooltips for truncated folder names?
