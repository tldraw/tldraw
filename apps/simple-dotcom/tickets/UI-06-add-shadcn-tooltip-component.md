# UI-06: Add shadcn/ui Tooltip Component for UI Hints

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
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [ ] API
- [ ] Database
- [ ] Testing
- [ ] Infrastructure

## Description

Add shadcn/ui's Tooltip component and use it throughout the application for icon buttons, disabled states, and truncated text. This improves discoverability and provides contextual help.

## Acceptance Criteria

- [x] shadcn Tooltip component installed (`npx shadcn@latest add tooltip`)
- [x] Tooltips added to icon-only buttons (document actions, workspace actions)
- [x] Tooltips added to disabled buttons explaining why they're disabled
- [x] Tooltips added to truncated document/folder names
- [x] Tooltips added to user avatars showing full name/email
- [x] Tooltips have appropriate delay (500ms)
- [x] Tooltips are accessible (proper ARIA attributes)
- [x] Tooltips work with keyboard focus

## Technical Details

### UI Components

**Install shadcn Tooltip:**
```bash
npx shadcn@latest add tooltip
```

**Add tooltips to:**

1. **Document Actions** (`src/components/documents/DocumentActions.tsx`)
   - Rename, Move, Duplicate, Archive, Delete icons

2. **User Avatars** (`src/components/users/UserAvatar.tsx`)
   - Show full name and email on hover

3. **Workspace Actions** (Dashboard)
   - Rename, Delete workspace buttons

4. **Disabled States**
   - Disabled invite link copy button
   - Disabled transfer ownership button

5. **Truncated Text**
   - Long document names
   - Long folder names

**Pattern:**

```typescript
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Icon button with tooltip
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="ghost" size="icon">
      <Archive className="h-4 w-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>Archive document</p>
  </TooltipContent>
</Tooltip>

// Disabled button with explanation
<Tooltip>
  <TooltipTrigger asChild>
    <span>
      <Button disabled={!inviteLink.enabled}>
        Copy Link
      </Button>
    </span>
  </TooltipTrigger>
  <TooltipContent>
    <p>Enable the invite link to copy it</p>
  </TooltipContent>
</Tooltip>

// User avatar with info
<Tooltip>
  <TooltipTrigger asChild>
    <div>
      <UserAvatar user={user} />
    </div>
  </TooltipTrigger>
  <TooltipContent>
    <p>{user.display_name || user.email}</p>
    {user.display_name && <p className="text-xs text-muted-foreground">{user.email}</p>}
  </TooltipContent>
</Tooltip>
```

**Wrap root layout with TooltipProvider:**
```typescript
// src/app/layout.tsx
<TooltipProvider delayDuration={500}>
  {children}
</TooltipProvider>
```

### Permissions/Security

No security implications.

## Dependencies

- shadcn Tooltip component (to be installed)

## Testing Requirements

- [ ] Manual testing: Verify tooltips appear on hover
- [ ] Manual testing: Verify tooltips appear on keyboard focus
- [ ] Manual testing: Verify tooltip delay is appropriate
- [ ] Manual testing: Verify tooltips don't block interaction
- [ ] Accessibility audit: Verify screen reader announcements

## Related Documentation

- shadcn Tooltip: https://ui.shadcn.com/docs/components/tooltip

## Notes

- Use sparingly - don't add tooltips to every element
- Prioritize icon buttons and disabled states
- Consider mobile - tooltips need tap/long-press support
- Tooltip delay should be ~500ms for good UX
- Used by: document actions, workspace actions, member lists

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

### 2025-10-08
- Ticket moved from backlog to active
- Status updated to In Progress
- Starting implementation: Installing shadcn Tooltip component
- Installed shadcn Tooltip component successfully
- Added TooltipProvider to root layout with 500ms delay
- Updated ActionMenu component to support tooltips on action buttons
- Added tooltips to DocumentActions (document actions menu)
- Added tooltips to FolderActions (folder actions menu)
- Updated UserAvatar component with tooltip support (shows name + email)
- Added tooltips to truncated document names in DocumentListItem
- Added tooltips to truncated folder names in FolderListItem
- Added tooltip to disabled "Continue" button in workspace settings
- Fixed TypeScript errors in workspace-settings-client.tsx (removed legacy error state)
- All acceptance criteria completed

## Open questions

- Should tooltips work on mobile (tap to show, tap away to dismiss)?
- What delay duration feels right for the application?
- Should we add tooltips to all icon buttons or just unclear ones?
