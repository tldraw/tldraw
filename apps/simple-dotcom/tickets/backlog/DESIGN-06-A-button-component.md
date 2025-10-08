# DESIGN-06-A: Button Component Integration

Date created: 2025-01-16
Date last updated: -
Date completed: -

## Status

- [x] Not Started
- [ ] In Progress
- [ ] Blocked
- [ ] Done

## Priority

- [x] P0 (MVP Required) - Foundation component

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

Replace all inline button implementations with shadcn/ui Button component. This is the highest priority foundational component that will establish patterns for all future shadcn work. The Button component is used in 35+ locations across the application with inconsistent styling and behavior.

**Impact:** Establishes consistent button patterns, reduces Tailwind duplication, improves maintainability, and sets foundation for all other component work.

## Acceptance Criteria

- [x] Install shadcn Button component via CLI
- [ ] Create Button component in `/src/components/ui/button.tsx`
- [ ] Support all required variants: default, destructive, outline, ghost, link
- [ ] Support all required sizes: default, sm, lg, icon
- [ ] Support loading state with spinner
- [ ] Support disabled state
- [ ] Preserve all existing data-testid attributes
- [ ] Replace all 35+ button instances across the application
- [ ] All existing E2E tests pass without modification
- [ ] Visual regression testing confirms no unintended style changes
- [ ] Dark mode works correctly for all button variants

## Technical Details

### Files to Modify

**Authentication Pages (6 instances):**
1. `/src/app/login/page.tsx:139-146` - Sign in button (default, loading)
2. `/src/app/signup/page.tsx:193-200` - Create account button (default, loading)
3. `/src/app/forgot-password/page.tsx:116-123` - Send reset link (default)
4. `/src/app/forgot-password/page.tsx:56-64` - Try again button (link)
5. `/src/app/reset-password/page.tsx:141-148` - Reset password (default)

**Dashboard (11 instances):**
6. `/src/app/dashboard/dashboard-client.tsx:495-505` - Create workspace (default)
7. `/src/app/dashboard/dashboard-client.tsx:556-568` - Rename workspace (outline)
8. `/src/app/dashboard/dashboard-client.tsx:560-568` - Delete workspace (destructive)
9. `/src/app/dashboard/dashboard-client.tsx:644-650` - New document (ghost)
10. `/src/app/dashboard/dashboard-client.tsx:682-687` - Sign out (outline)
11. `/src/app/dashboard/dashboard-client.tsx:675-679` - Profile link (outline)
12. Dashboard modals - 5+ modal action buttons (cancel/confirm)

**Workspace Browser (8 instances):**
13. `/src/app/workspace/[workspaceId]/workspace-browser-client.tsx:453-461` - Root folder
14. `/src/app/workspace/[workspaceId]/workspace-browser-client.tsx:494-513` - Create folder (icon)
15. `/src/app/workspace/[workspaceId]/workspace-browser-client.tsx:548-559` - Create document (default)
16. Workspace browser modals - 4+ modal action buttons

**Workspace Settings (10 instances):**
17-26. Various settings actions, transfer ownership, danger zone buttons

**Profile:**
27. `/src/app/profile/profile-client.tsx:175-182` - Save changes (default)

**Invite Flow:**
28. `/src/app/invite/[token]/invite-accept-client.tsx:75-81` - Join workspace (default)

### Implementation Pattern

```tsx
import { Button } from '@/components/ui/button'

// Before:
<button
  onClick={handleClick}
  disabled={loading}
  data-testid="create-button"
  className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50"
>
  {loading ? 'Creating...' : 'Create'}
</button>

// After:
<Button
  onClick={handleClick}
  disabled={loading}
  data-testid="create-button"
>
  {loading ? 'Creating...' : 'Create'}
</Button>
```

### Variant Mapping

**Current Pattern → shadcn Variant:**
- `bg-foreground text-background` → `variant="default"`
- `bg-red-500 text-white` → `variant="destructive"`
- `border border-foreground/20` → `variant="outline"`
- `hover:underline text-sm` → `variant="link"`
- Hover-only visible buttons → `variant="ghost"`

### Loading State Pattern

Create reusable loading button wrapper:
```tsx
<Button disabled={loading}>
  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {loading ? 'Loading...' : 'Submit'}
</Button>
```

## Dependencies

- DESIGN-06 foundation ticket (COMPLETE - infrastructure set up)
- shadcn/ui Button component installation
- lucide-react for loading icons
- No other component dependencies

## Testing Requirements

- [ ] E2E tests pass without modification (buttons still clickable via data-testid)
- [ ] Visual regression testing for all button states:
  - Default, hover, focus, active, disabled
  - Loading state with spinner
  - All variants (default, destructive, outline, ghost, link)
  - Light and dark mode
- [ ] Keyboard navigation works (Tab, Enter, Space)
- [ ] Screen reader accessibility verified
- [ ] Test button focus states in forms

### Critical E2E Tests

- `e2e/auth.spec.ts` - Login/signup button interactions
- `e2e/workspace.spec.ts` - Workspace CRUD operations
- `e2e/document.spec.ts` - Document operations

## Related Documentation

- Component Inventory: See `SHADCN_COMPONENT_INVENTORY.md` - Button Component section
- shadcn/ui Button docs: https://ui.shadcn.com/docs/components/button
- Product spec: All pages with interactive elements

## Notes

**Critical:** This is the FIRST component to implement. All patterns established here (props, variants, testing approach) will be replicated in subsequent components.

**Style Decisions:**
- Use shadcn default styling (neutral theme)
- Don't preserve existing custom button styles - prefer shadcn defaults for consistency
- Loading spinner should use lucide-react `Loader2` icon
- Maintain existing data-testid attributes for E2E test stability

**Future Enhancements (not in scope):**
- Icon button variant (will be needed later)
- Button group component
- Split button / dropdown button

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days) - 35+ replacements with testing
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

[Track progress, decisions, and blockers as work proceeds]

**2025-01-16:** Ticket created from DESIGN-06 inventory. Foundation infrastructure complete (CSS variables, utils, dependencies installed).

**2025-10-08:** Button component integration started. Progress:

**Completed:**
- ✅ Installed shadcn Button component via CLI (`npx shadcn@latest add button`)
- ✅ Button component created at `/src/components/ui/button.tsx` with all required variants
- ✅ Replaced all authentication page buttons:
  - `login/page.tsx` - Sign in button with loading state
  - `signup/page.tsx` - Create account button with validation
  - `forgot-password/page.tsx` - Send reset link button
  - `reset-password/page.tsx` - Reset password button
- ✅ Replaced invite flow button (`invite/[token]/invite-accept-client.tsx`)
- ✅ Replaced profile page button (`profile/profile-client.tsx`)
- ✅ Added Button imports to dashboard file in preparation
- ✅ All existing data-testid attributes preserved for E2E test compatibility
- ✅ Loading states implemented using inline pattern (no separate LoadingButton wrapper needed yet)

**Partial Progress:**
- ⚠️ Dashboard buttons: Import added, buttons identified but not yet replaced (11+ instances)
- ⚠️ Workspace browser: Not started (8+ instances)
- ⚠️ Workspace settings: Not started (10+ instances)

**Testing Status:**
- E2E tests not yet run due to time constraints
- TypeScript compilation in progress
- No visual regression testing performed yet

**Notes:**
- User is simultaneously upgrading auth/profile pages with shadcn Form, Alert, Input, and Label components
- This complementary work means some files are being actively edited with comprehensive shadcn integration
- Remaining button replacements (dashboard, workspace browser, settings) are straightforward but require systematic replacement
- All patterns established; remaining work is mechanical application of the same Button component

**Recommendation:**
Complete remaining button replacements in dashboard, workspace browser, and workspace settings files using the same pattern established in auth pages. Then run full E2E test suite to verify no regressions.

## Open questions

1. Should we create a `LoadingButton` wrapper component or handle loading inline?
   - **Decision:** Handle inline for now, create wrapper if pattern repeats 5+ times
2. Icon positioning in buttons with text - before or after?
   - **Decision:** Follow shadcn convention (icons before text)
