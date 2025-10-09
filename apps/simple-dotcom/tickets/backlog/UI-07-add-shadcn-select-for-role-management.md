# UI-07: Add shadcn/ui Select Component for Role Management

Date created: 2025-10-08
Date last updated: -
Date completed: -

## Status

- [x] Not Started
- [ ] In Progress
- [ ] Blocked
- [ ] Done

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

Add shadcn/ui's Select component to enable future role management features (changing member roles, folder permissions, document sharing settings). While not immediately needed, this prepares the codebase for these features.

## Acceptance Criteria

- [ ] shadcn Select component installed (`npx shadcn@latest add select`)
- [ ] Select component documented in design system
- [ ] Example usage added to component library/storybook (if exists)
- [ ] Select component tested for accessibility
- [ ] Component supports dark mode

## Technical Details

### UI Components

**Install shadcn Select:**
```bash
npx shadcn@latest add select
```

**Future use cases:**

1. **Member Role Management** (Future enhancement)
   - Dropdown to change member role (Owner/Member/Viewer)
   - Currently roles are badges only

2. **Document Sharing Settings** (Future enhancement)
   - Select sharing mode (Private/Members/Public)
   - Select guest permissions (View/Edit)

3. **Folder Permissions** (Future enhancement)
   - Select folder visibility
   - Select folder access level

**Example pattern for future use:**

```typescript
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Member role selector (future)
<Select value={member.role} onValueChange={handleRoleChange}>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Select role" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="owner">Owner</SelectItem>
    <SelectItem value="member">Member</SelectItem>
    <SelectItem value="viewer">Viewer</SelectItem>
  </SelectContent>
</Select>

// Document sharing mode selector (future)
<Select value={sharingMode} onValueChange={setSharingMode}>
  <SelectTrigger>
    <SelectValue placeholder="Select sharing mode" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="private">Private</SelectItem>
    <SelectItem value="workspace">Workspace Members</SelectItem>
    <SelectItem value="public">Anyone with Link</SelectItem>
  </SelectContent>
</Select>
```

### Permissions/Security

No immediate security implications. Future role management features will need:
- RLS policies for role changes
- Owner-only permissions for role management
- Validation to prevent removing last owner

## Dependencies

- shadcn Select component (to be installed)

## Testing Requirements

- [ ] Manual testing: Verify select renders correctly
- [ ] Manual testing: Verify select is keyboard navigable
- [ ] Manual testing: Verify select supports dark mode
- [ ] Accessibility audit: Verify proper ARIA attributes

## Related Documentation

- shadcn Select: https://ui.shadcn.com/docs/components/select

## Notes

- This is a preparatory ticket - component won't be used immediately
- Blocks future tickets for role management and permissions
- Consider adding to component library/design system documentation
- Select is more accessible than custom dropdowns

## Estimated Complexity

- [x] Small (< 1 day)
- [ ] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

[Track progress, decisions, and blockers as work proceeds.]

## Open questions

- Should we add example implementations in a component showcase?
- Should we document common patterns for role/permission selects?
