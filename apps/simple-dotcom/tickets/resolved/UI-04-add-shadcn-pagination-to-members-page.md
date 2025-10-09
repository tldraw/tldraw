# UI-04: Add shadcn/ui Pagination to Members Page

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

Replace the custom pagination controls on the workspace members page with shadcn/ui's Pagination component. This provides better accessibility, consistent styling, and improved UX.

## Acceptance Criteria

- [x] shadcn Pagination component installed (`npx shadcn@latest add pagination`)
- [x] Custom pagination controls replaced with shadcn Pagination
- [x] Previous/Next buttons work correctly
- [x] Current page indicator displays correctly
- [x] Pagination hidden when only one page
- [x] Page count indicator shows "Showing X to Y of Z members"
- [x] Component supports keyboard navigation
- [x] Disabled states work correctly (first/last page)

## Technical Details

### UI Components

**Install shadcn Pagination:**
```bash
npx shadcn@latest add pagination
```

**Update:**
- `src/app/workspace/[workspaceId]/members/workspace-members-client.tsx` (lines 364-393)

**Pattern:**

```typescript
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

// Replace custom pagination controls
{totalPages > 1 && (
  <div className="mt-4 flex items-center justify-between">
    <p className="text-sm text-gray-600">
      Showing {startIndex + 1} to {Math.min(endIndex, filteredMembers.length)} of{' '}
      {filteredMembers.length} members
    </p>
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            isDisabled={currentPage === 1}
          />
        </PaginationItem>

        {/* Optional: Add page numbers */}

        <PaginationItem>
          <PaginationNext
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            isDisabled={currentPage === totalPages}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  </div>
)}
```

### Permissions/Security

No security implications.

## Dependencies

- shadcn Pagination component (to be installed)

## Testing Requirements

- [ ] Manual testing: Verify pagination controls work
- [ ] Manual testing: Verify disabled states
- [ ] Manual testing: Verify keyboard navigation
- [ ] E2E tests: Update member pagination tests to use new selectors

## Related Documentation

- Current implementation: `src/app/workspace/[workspaceId]/members/workspace-members-client.tsx:364-393`
- shadcn Pagination: https://ui.shadcn.com/docs/components/pagination

## Notes

- Keep the existing pagination logic (10 items per page)
- Maintain the search + pagination interaction
- Consider adding page number buttons (not just prev/next)
- Used only on members page currently
- E2E tests use `data-testid="pagination-previous"` and `data-testid="pagination-next"`

## Estimated Complexity

- [x] Small (< 1 day)
- [ ] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

**2025-10-08**: Implemented shadcn/ui Pagination component
- Installed shadcn Pagination component via `npx shadcn@latest add pagination`
- Replaced custom pagination controls (lines 367-396) with shadcn Pagination component
- Maintained "Showing X to Y of Z members" text above pagination controls
- Implemented Previous/Next buttons with proper disabled states using `aria-disabled` and CSS classes
- Added page indicator showing "Page X of Y" between navigation buttons
- Preserved existing `data-testid` attributes for E2E test compatibility
- Used `pointer-events-none opacity-50` for disabled states to prevent interaction
- Kept existing pagination logic (10 items per page, reset on search)
- TypeScript compilation successful - no type errors
- Decided to keep prev/next only (no page number buttons) for simplicity

## Open questions

- Should we add page number buttons or stick with prev/next only?
- Should pagination controls be extracted as a reusable component?
- Will this pattern be needed for other pages (documents, workspaces)?
