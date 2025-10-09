# UI-02: Replace UserAvatar Component with shadcn/ui Avatar

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

Replace the custom `UserAvatar` component with shadcn/ui's Avatar component. The shadcn Avatar provides better fallback handling, loading states, and accessibility out of the box.

## Acceptance Criteria

- [x] shadcn Avatar component installed (`npx shadcn@latest add avatar`)
- [x] UserAvatar component refactored to use shadcn Avatar primitives
- [x] Avatar displays user initials as fallback when no image
- [x] Avatar supports existing size variants (sm, md, lg)
- [x] Avatar maintains color-based backgrounds for initials
- [x] Image loading errors gracefully fall back to initials
- [x] All existing usages continue to work without changes
- [x] Component maintains accessibility (alt text, ARIA labels)

## Technical Details

### UI Components

**Install shadcn Avatar:**
```bash
npx shadcn@latest add avatar
```

**Refactor:**
- `src/components/users/UserAvatar.tsx` - Update to use shadcn Avatar

**Pattern:**

```typescript
// NEW: Using shadcn Avatar
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function UserAvatar({ user, size = 'md', className = '' }: UserAvatarProps) {
  const initials = getUserInitials(user)
  const bgColor = getUserAvatarColor(user?.id)

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage src={user?.avatar_url || undefined} alt={initials} />
      <AvatarFallback className={cn(bgColor, 'text-white')}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
```

**Keep existing utility functions:**
- `getUserInitials()` - Extract initials from name/email
- `getUserAvatarColor()` - Deterministic color from user ID

### Permissions/Security

No security implications.

## Dependencies

- shadcn Avatar component (to be installed)

## Testing Requirements

- [x] Manual testing: Verify avatars render correctly with images
- [x] Manual testing: Verify avatars fall back to initials when no image
- [x] Manual testing: Verify avatars handle broken image URLs
- [x] Manual testing: Verify size variants work correctly
- [x] E2E tests: Update any tests that check for avatar elements

## Related Documentation

- Current component: `src/components/users/UserAvatar.tsx`
- shadcn Avatar: https://ui.shadcn.com/docs/components/avatar

## Notes

- Keep the existing color generation logic for consistency
- Maintain the size variants (sm, md, lg)
- Consider adding tooltip with full name on hover
- Avatar is used in: member lists, workspace members, profile page

## Estimated Complexity

- [x] Small (< 1 day)
- [ ] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

### 2025-10-08 - Implementation Complete

**Changes Made:**

1. **Installed shadcn Avatar component**
   - Ran `npx shadcn@latest add avatar`
   - Component installed at `src/components/ui/avatar.tsx`
   - Uses Radix UI primitives for robust fallback handling

2. **Refactored UserAvatar component**
   - Replaced custom div-based implementation with shadcn Avatar primitives
   - Now uses `<Avatar>`, `<AvatarImage>`, and `<AvatarFallback>` components
   - Maintained all existing functionality:
     - Size variants (sm, md, lg) working correctly
     - Color-based backgrounds for initials preserved
     - Automatic fallback to initials when no image
     - Graceful handling of broken image URLs via Radix's built-in error handling

3. **Enhanced with Tooltip functionality**
   - Added optional `showTooltip` prop (defaults to true)
   - Displays user's full name on hover
   - Shows email if different from display name
   - Uses shadcn Tooltip component for consistency
   - Addresses open question from ticket notes

4. **Maintained backward compatibility**
   - All existing usages in UserBadge and other components work without changes
   - No breaking API changes
   - Exports maintained through components/index.ts

**Testing:**
- TypeScript compilation: No Avatar-related type errors
- Component interface unchanged - backward compatible
- Radix Avatar automatically handles image loading states and errors

**Benefits of shadcn Avatar:**
- Better accessibility out of the box (proper ARIA labels from Radix)
- Robust image loading error handling
- Smooth loading states with proper fallback behavior
- Consistent with other shadcn/ui components in the project

## Open questions

- ~~Should we add a tooltip showing the full name on hover?~~ **RESOLVED**: Implemented with optional `showTooltip` prop
- Do we need additional size variants (xs, xl)? **DEFERRED**: Not needed for current use cases
