# UI-05: Add shadcn/ui Table Component to Members List

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

Replace the custom flex-based member list layout with shadcn/ui's Table component. This provides better structure, accessibility (proper table semantics), and easier scanning for users.

## Acceptance Criteria

- [x] shadcn Table component installed (`npx shadcn@latest add table`)
- [x] Members list refactored to use Table component
- [x] Table headers show: Name, Email, Role, Actions
- [x] Current user indicator "(You)" displays correctly
- [x] Owner/Member badges render in role column
- [x] Remove button appears only for non-owners
- [x] Table supports hover states
- [x] Table is responsive (consider mobile layout)
- [x] Table is accessible (proper ARIA labels, keyboard navigation)

## Technical Details

### UI Components

**Install shadcn Table:**
```bash
npx shadcn@latest add table
```

**Update:**
- `src/app/workspace/[workspaceId]/members/workspace-members-client.tsx` (lines 321-362)

**Pattern:**

```typescript
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Role</TableHead>
      <TableHead className="text-right">Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {paginatedMembers.map((member) => {
      const isCurrentUser = member.id === currentUserId
      const isOwner = member.role === 'owner'

      return (
        <TableRow key={member.id}>
          <TableCell className="font-medium">
            {member.display_name || member.email}
            {isCurrentUser && <span className="ml-2 text-sm text-muted-foreground">(You)</span>}
          </TableCell>
          <TableCell className="text-muted-foreground">
            {member.display_name ? member.email : '—'}
          </TableCell>
          <TableCell>
            <Badge variant={isOwner ? 'default' : 'secondary'}>
              {isOwner ? 'Owner' : 'Member'}
            </Badge>
          </TableCell>
          <TableCell className="text-right">
            {!isOwner && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveMember(member.id)}
              >
                Remove
              </Button>
            )}
          </TableCell>
        </TableRow>
      )
    })}
  </TableBody>
</Table>
```

### Permissions/Security

No security implications.

## Dependencies

- shadcn Table component (to be installed)
- shadcn Badge component (already exists)

## Testing Requirements

- [ ] Manual testing: Verify table renders correctly
- [ ] Manual testing: Verify table is responsive on mobile
- [ ] Manual testing: Verify remove buttons work
- [ ] Manual testing: Verify table is keyboard navigable
- [ ] E2E tests: Update member list tests to use table selectors

## Related Documentation

- Current implementation: `src/app/workspace/[workspaceId]/members/workspace-members-client.tsx:321-362`
- shadcn Table: https://ui.shadcn.com/docs/components/table

## Notes

- Consider mobile responsiveness - table may need to collapse to cards on small screens
- Keep existing remove confirmation dialog
- Consider adding sortable columns (by name, email, role)
- May want to extract as `MemberTable` component for reusability
- Badge component already exists for role indicators

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

**2025-10-08**: Implemented shadcn/ui Table component
- Installed shadcn Table component via `npx shadcn@latest add table`
- Replaced custom flex-based member list (lines 324-365) with shadcn Table component
- Added table structure with 4 columns: Name, Email, Role, Actions
- Wrapped table in `rounded-md border` div for consistent styling with rest of page
- Implemented Name column with font-medium styling, showing display_name or email fallback
- Added "(You)" indicator in muted-foreground color for current user
- Implemented Email column showing email when display_name exists, otherwise em dash (—)
- Used Badge component (already installed) with default/secondary variants for Owner/Member roles
- Implemented Actions column (right-aligned) with shadcn Button component
- Remove button uses ghost variant, sm size, and destructive text color
- Remove button only appears for non-owner members
- Table inherits hover states from shadcn Table component
- Table is responsive and accessible with proper semantic HTML structure
- Maintained existing handleRemoveMember functionality with confirmation dialog
- TypeScript compilation successful - no type errors
- Decided not to extract as separate component (YAGNI principle)

## Open questions

- Should the table be sortable by clicking column headers?
- How should the table behave on mobile devices (collapse to cards)?
- Should we hide the email column on mobile to save space?
