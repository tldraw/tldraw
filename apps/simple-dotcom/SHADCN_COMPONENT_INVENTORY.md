# shadcn/ui Component Inventory

**Date Created:** 2025-01-16
**Status:** Complete - Ready for Implementation Planning

## Executive Summary

This document catalogs all UI component opportunities identified across the Simple tldraw application frontend. The audit analyzed 47 TSX files across pages, components, and layouts, identifying **15 high-priority components** for shadcn/ui integration.

**Key Findings:**
- **180+ individual UI elements** suitable for shadcn replacement
- **22 modal dialogs** currently using custom implementations
- **40+ form inputs** with inconsistent styling
- **35+ buttons** across different contexts and states
- **Strong foundation** for systematic shadcn integration

---

## Component Priority Matrix

### P0 - Critical Foundation (Implement First)
Components used everywhere, establish patterns for all future work.

| Component | Usage Count | Complexity | Impact |
|-----------|-------------|------------|--------|
| Button | 35+ | Low | High |
| Input | 40+ | Low | High |
| Label | 40+ | Low | High |
| Dialog | 22 | Medium | High |

### P1 - High Value (Implement Second)
Significant usage, high visual consistency impact.

| Component | Usage Count | Complexity | Impact |
|-----------|-------------|------------|--------|
| Form | 10 | Medium | High |
| Alert | 15+ | Low | Medium |
| Card | 8 | Low | Medium |
| Badge | 5 | Low | Medium |

### P2 - Enhancement (Implement Third)
Improves UX and loading states.

| Component | Usage Count | Complexity | Impact |
|-----------|-------------|------------|--------|
| Dropdown Menu | 2 | Medium | Medium |
| Separator | 6 | Low | Low |
| Select | 1 | Medium | Medium |
| Spinner | 5+ | Low | Medium |
| Toast | 0 (new) | Medium | High |

### P3 - Future Enhancements
Nice-to-have improvements, not blocking.

| Component | Usage Count | Complexity | Impact |
|-----------|-------------|------------|--------|
| Skeleton | 0 (new) | Low | Low |
| Tooltip | 0 (new) | Low | Low |
| Switch | 0 (potential) | Low | Low |

---

## Detailed Component Inventory

### 1. Button Component

**Priority:** P0 (Critical Foundation)
**Estimated Instances:** 35+
**Shadcn Variants Needed:** default, destructive, outline, ghost, link

#### Current State
Currently using inline Tailwind classes with inconsistent patterns:
```tsx
// Pattern 1: Primary button
className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:bg-foreground/90"

// Pattern 2: Destructive button
className="rounded-md bg-red-500 text-white px-4 py-2 text-sm font-medium hover:opacity-90"

// Pattern 3: Secondary/outline button
className="rounded-md border border-foreground/20 px-4 py-2 text-sm hover:bg-foreground/5"
```

#### Locations

**Authentication Pages:**
- `/app/login/page.tsx:139-146` - Sign in button (primary, loading state)
- `/app/signup/page.tsx:193-200` - Create account button (primary, loading state)
- `/app/forgot-password/page.tsx:116-123` - Send reset link button (primary)
- `/app/reset-password/page.tsx:141-148` - Reset password button (primary)

**Dashboard:**
- `/app/dashboard/dashboard-client.tsx:495-505` - Create workspace button (primary)
- `/app/dashboard/dashboard-client.tsx:556-568` - Rename workspace button (outline)
- `/app/dashboard/dashboard-client.tsx:560-568` - Delete workspace button (destructive)
- `/app/dashboard/dashboard-client.tsx:644-650` - New document button (ghost)
- `/app/dashboard/dashboard-client.tsx:682-687` - Sign out button (outline)
- `/app/dashboard/dashboard-client.tsx:675-679` - Profile link button (outline)

**Workspace Browser:**
- `/app/workspace/[workspaceId]/workspace-browser-client.tsx:453-461` - Root folder button (variant)
- `/app/workspace/[workspaceId]/workspace-browser-client.tsx:494-513` - Create folder button (icon button)
- `/app/workspace/[workspaceId]/workspace-browser-client.tsx:548-559` - Create document button (primary)

**Workspace Settings:**
- `/app/workspace/[workspaceId]/settings/workspace-settings-client.tsx:341-347` - Save rename button (primary)
- `/app/workspace/[workspaceId]/settings/workspace-settings-client.tsx:366-371` - Rename trigger button (outline)
- `/app/workspace/[workspaceId]/settings/workspace-settings-client.tsx:459-473` - Toggle invite link (conditional variant)
- `/app/workspace/[workspaceId]/settings/workspace-settings-client.tsx:475-481` - Regenerate link button (outline)
- `/app/workspace/[workspaceId]/settings/workspace-settings-client.tsx:525-537` - Transfer ownership continue (primary)
- `/app/workspace/[workspaceId]/settings/workspace-settings-client.tsx:559-565` - Confirm transfer (destructive)
- `/app/workspace/[workspaceId]/settings/workspace-settings-client.tsx:591-597` - Leave workspace (destructive)
- `/app/workspace/[workspaceId]/settings/workspace-settings-client.tsx:607-614` - Delete workspace (destructive)

**Profile:**
- `/app/profile/profile-client.tsx:175-182` - Save changes button (primary)

**Invite Flow:**
- `/app/invite/[token]/invite-accept-client.tsx:75-81` - Join workspace button (primary)

**Modal Actions (across all modals):**
- Cancel buttons (outline variant) - 10+ instances
- Confirm buttons (primary/destructive variants) - 10+ instances

#### Implementation Notes
- Need to support loading states with spinner
- Need disabled states for validation
- Need data-testid support for E2E tests
- Consider size variants: default, sm, lg
- Icon button variant for actions menus

---

### 2. Input Component

**Priority:** P0 (Critical Foundation)
**Estimated Instances:** 40+
**Shadcn Variants Needed:** default, error state

#### Current State
Inconsistent Tailwind patterns:
```tsx
// Standard pattern
className="w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/40"

// Error state pattern
className={`w-full px-3 py-2 rounded-md border ${validationError ? 'border-red-500' : 'border-foreground/20'} bg-background mb-2`}

// Disabled pattern
className="w-full rounded-md border border-foreground/20 bg-foreground/5 px-3 py-2 text-sm text-foreground/60 cursor-not-allowed"
```

#### Locations

**Authentication Pages:**
- `/app/login/page.tsx:98-109` - Email input
- `/app/login/page.tsx:124-135` - Password input
- `/app/signup/page.tsx:138-148` - Name input
- `/app/signup/page.tsx:155-166` - Email input
- `/app/signup/page.tsx:173-184` - Password input (with validation hint)
- `/app/forgot-password/page.tsx:102-113` - Email input
- `/app/reset-password/page.tsx:108-119` - New password input
- `/app/reset-password/page.tsx:126-137` - Confirm password input

**Dashboard Modals:**
- `/app/dashboard/dashboard-client.tsx:735-755` - Workspace name input (with validation)
- `/app/dashboard/dashboard-client.tsx:788-796` - Rename workspace input
- `/app/dashboard/dashboard-client.tsx:863-878` - Document name input (with validation)

**Workspace Browser Modals:**
- `/app/workspace/[workspaceId]/workspace-browser-client.tsx:613-628` - Document name input
- `/app/workspace/[workspaceId]/workspace-browser-client.tsx:661-676` - Folder name input

**Profile:**
- `/app/profile/profile-client.tsx:124-133` - Email input (disabled)
- `/app/profile/profile-client.tsx:140-151` - Name input
- `/app/profile/profile-client.tsx:158-169` - Display name input

**Workspace Settings:**
- `/app/workspace/[workspaceId]/settings/workspace-settings-client.tsx:332-339` - Workspace rename input
- `/app/workspace/[workspaceId]/settings/workspace-settings-client.tsx:427-432` - Invitation link display (read-only)

#### Implementation Notes
- Support for controlled/uncontrolled modes
- Error state styling integration
- Support for disabled state
- Support for read-only state
- Placeholder styling consistency
- Auto-select text pattern (document/folder creation)
- Integration with React Hook Form

---

### 3. Label Component

**Priority:** P0 (Critical Foundation)
**Estimated Instances:** 40+
**Shadcn Variants Needed:** default

#### Current State
Simple but inconsistent:
```tsx
className="block text-sm font-medium mb-2"
className="block text-sm font-medium text-gray-700 mb-2"
```

#### Locations
Every input field has an accompanying label. Key patterns:

**Standard Labels:**
- All form pages (login, signup, forgot password, reset password)
- Profile settings form
- Modal input labels

**Inline Labels:**
- Settings sections headers
- Form field groups

#### Implementation Notes
- Associate with input fields via `htmlFor`
- Support for required indicator (*)
- Support for helper text positioning
- Consistent typography and spacing

---

### 4. Dialog Component

**Priority:** P0 (Critical Foundation)
**Estimated Instances:** 22
**Shadcn Variants Needed:** default with overlay

#### Current State
Custom modal implementation:
```tsx
<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
  <div className="bg-background rounded-lg p-6 max-w-md w-full border border-foreground/20">
    {/* content */}
  </div>
</div>
```

#### Locations

**Dashboard Modals:**
- `/app/dashboard/dashboard-client.tsx:731-781` - Create workspace modal
- `/app/dashboard/dashboard-client.tsx:783-820` - Rename workspace modal
- `/app/dashboard/dashboard-client.tsx:823-854` - Delete workspace confirmation modal
- `/app/dashboard/dashboard-client.tsx:856-904` - Create document modal

**Workspace Browser Modals:**
- `/app/workspace/[workspaceId]/workspace-browser-client.tsx:608-654` - Create document modal
- `/app/workspace/[workspaceId]/workspace-browser-client.tsx:656-702` - Create folder modal

**Document Actions:**
- Window prompts used in `/components/documents/DocumentActions.tsx:36-42` - Rename prompt (should be Dialog)
- Window confirm used in `/components/documents/DocumentActions.tsx:141-146` - Delete confirmation (should be Dialog)

**Folder Actions:**
- Similar window prompts/confirms throughout FolderActions

**Settings Modals:**
- Confirmation dialogs for destructive actions (transfer, delete, leave)

#### Implementation Notes
- Keyboard escape handling (currently custom implemented)
- Click outside to close
- Focus trap for accessibility
- Animation/transitions for open/close
- Support for validation error display
- Support for async actions with loading states
- Replace all `window.prompt()` and `window.confirm()` calls

---

### 5. Form Component

**Priority:** P1 (High Value)
**Estimated Instances:** 10
**Shadcn Integration:** React Hook Form wrapper

#### Current State
Plain `<form>` elements with manual validation:
```tsx
<form onSubmit={handleSubmit} className="mt-8 space-y-6">
  {/* manual error handling */}
  {/* manual input state */}
</form>
```

#### Locations

**Authentication Forms:**
- `/app/login/page.tsx:83-147` - Login form
- `/app/signup/page.tsx:123-201` - Signup form
- `/app/forgot-password/page.tsx:88-131` - Forgot password form
- `/app/reset-password/page.tsx:93-149` - Reset password form

**Settings Forms:**
- `/app/profile/profile-client.tsx:91-183` - Profile update form
- `/app/workspace/[workspaceId]/settings/workspace-settings-client.tsx:331-361` - Workspace rename form

**Modal Forms:**
- All create/rename modals contain form-like structures

#### Implementation Notes
- Integrate React Hook Form for validation
- Consistent error display patterns
- Loading states during submission
- Form-level error messages vs field-level
- Client-side validation rules
- Async validation support (unique names, etc.)

---

### 6. Alert Component

**Priority:** P1 (High Value)
**Estimated Instances:** 15+
**Shadcn Variants Needed:** default, destructive, success

#### Current State
Inline Tailwind alert boxes:
```tsx
// Error alert
<div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-800 dark:text-red-200">
  {error}
</div>

// Success alert
<div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4 text-sm text-green-800 dark:text-green-200">
  Success message
</div>

// Info alert (invite context)
<div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 text-blue-800 dark:text-blue-200">
  <p className="text-sm font-medium">{inviteContext}</p>
</div>
```

#### Locations

**Error Messages:**
- `/app/login/page.tsx:84-90` - Login error
- `/app/signup/page.tsx:124-130` - Signup error
- `/app/forgot-password/page.tsx:89-95` - Password reset error
- `/app/reset-password/page.tsx:94-100` - Reset password error
- `/app/profile/profile-client.tsx:102-108` - Profile update error
- `/app/workspace/[workspaceId]/settings/workspace-settings-client.tsx:325` - Settings error
- Modal validation errors across all modals

**Success Messages:**
- `/app/signup/page.tsx:104-121` - Email confirmation sent
- `/app/forgot-password/page.tsx:46-53` - Reset email sent
- `/app/profile/profile-client.tsx:111-117` - Profile saved
- `/app/reset-password/page.tsx:72-78` - Password reset success
- `/app/dashboard/dashboard-client.tsx:464-488` - Leave workspace success banner

**Info Messages:**
- `/app/login/page.tsx:64-68` - Invite context
- `/app/signup/page.tsx:84-88` - Invite context
- `/app/profile/profile-client.tsx:92-100` - Unsaved changes warning

**Invitation Page States:**
- `/app/invite/[token]/invite-accept-client.tsx:71-73` - Error state
- Multiple status-specific messages throughout invite flow

#### Implementation Notes
- Support for dismissible alerts (close button)
- Support for icons (info, warning, success, error)
- Auto-dismiss functionality (timeout)
- Persistent vs temporary alerts
- Banner-style alerts (full-width for page-level messages)

---

### 7. Card Component

**Priority:** P1 (High Value)
**Estimated Instances:** 8
**Shadcn Variants Needed:** default

#### Current State
Custom card implementations:
```tsx
// DocumentCard
<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
  {/* content */}
</div>

// Settings sections
<section className="rounded-lg border p-6">
  {/* content */}
</section>
```

#### Locations

**Document Cards:**
- `/components/documents/DocumentCard.tsx:66-134` - Document grid card with thumbnail, metadata, actions overlay

**Dashboard Content:**
- `/app/dashboard/dashboard-client.tsx:691-727` - Welcome card with recent documents
- `/app/dashboard/dashboard-client.tsx:522-662` - Workspace list items (card-like structure)
- `/app/dashboard/dashboard-client.tsx:700-716` - Recent documents list items

**Settings Sections:**
- `/app/workspace/[workspaceId]/settings/workspace-settings-client.tsx:328-380` - Workspace name section
- `/app/workspace/[workspaceId]/settings/workspace-settings-client.tsx:383-393` - Workspace type section
- `/app/workspace/[workspaceId]/settings/workspace-settings-client.tsx:396-489` - Invitation link section
- `/app/workspace/[workspaceId]/settings/workspace-settings-client.tsx:583-617` - Danger zone section

#### Implementation Notes
- Support for hover states
- Support for click interactions (DocumentCard)
- Support for section headers
- Support for padding variants
- Border/shadow variants
- Dark mode compatibility

---

### 8. Badge Component

**Priority:** P1 (High Value)
**Estimated Instances:** 5
**Shadcn Variants Needed:** default, success, destructive, outline

#### Current State
Inline badge styling:
```tsx
// Status badge
<span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
  Enabled
</span>

// Archive badge
<span className="text-xs bg-gray-900/75 text-white px-2 py-1 rounded">Archived</span>
```

#### Locations

**Workspace Settings:**
- `/app/workspace/[workspaceId]/settings/workspace-settings-client.tsx:410-421` - Invitation link status badge (enabled/disabled)

**Document Card:**
- `/components/documents/DocumentCard.tsx:113-117` - Archived badge overlay

**Workspace Browser:**
- `/app/workspace/[workspaceId]/workspace-browser-client.tsx:417-419` - Owner/member role display

**Dashboard:**
- `/app/dashboard/dashboard-client.tsx:548-551` - Private/Shared workspace type

**Potential Future Usage:**
- Document sharing status
- User roles/permissions
- Feature flags
- Status indicators

#### Implementation Notes
- Size variants (xs, sm, default)
- Color variants matching alerts (success, error, warning, info)
- Icon support (optional leading icon)
- Removable variant (with X button)

---

### 9. Dropdown Menu Component

**Priority:** P2 (Enhancement)
**Estimated Instances:** 2
**Shadcn Variants Needed:** default with sub-menus

#### Current State
Custom ActionMenu implementation:
```tsx
// ActionMenu component
<div className="relative">
  <button onClick={() => setIsOpen(!isOpen)}>
    {/* trigger */}
  </button>
  {isOpen && (
    <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white">
      {/* menu items */}
    </div>
  )}
</div>
```

#### Locations

**Document Actions:**
- `/components/shared/ActionMenu.tsx:24-147` - Reusable dropdown menu component
- `/components/documents/DocumentActions.tsx:168` - Document actions dropdown (rename, duplicate, archive, delete)

**Usage Contexts:**
- Document cards (grid view)
- Document list items (list view)
- Potentially folder actions

#### Implementation Notes
- Current ActionMenu is well-implemented but not consistent with shadcn patterns
- Need keyboard navigation (arrow keys, enter, escape)
- Need dividers between action groups
- Support for icons in menu items
- Support for disabled items
- Support for destructive actions (red styling)
- Click outside to close
- Position awareness (flip if near edge)

---

### 10. Separator Component

**Priority:** P2 (Enhancement)
**Estimated Instances:** 6
**Shadcn Variants Needed:** horizontal, vertical

#### Current State
Various divider implementations:
```tsx
// Border dividers
className="border-b border-foreground/20"
className="border-t border-foreground/20"

// HR elements
<div className="border-t border-gray-100 dark:border-gray-700 my-1" />

// Section dividers in settings
<div className="border-t pt-4">
```

#### Locations

**Dashboard:**
- `/app/dashboard/dashboard-client.tsx:493` - Sidebar header divider
- `/app/dashboard/dashboard-client.tsx:490` - Folder section divider

**Workspace Browser:**
- `/app/workspace/[workspaceId]/workspace-browser-client.tsx:490` - Sidebar section divider

**Action Menus:**
- `/components/shared/ActionMenu.tsx:110-116` - Menu item group divider

**Settings Pages:**
- Between settings sections (multiple instances)

#### Implementation Notes
- Consistent spacing above/below
- Dark mode support
- Orientation variants (most are horizontal)
- Optional label/text in middle (rare use case)

---

### 11. Select Component

**Priority:** P2 (Enhancement)
**Estimated Instances:** 1 (but important)
**Shadcn Variants Needed:** default

#### Current State
Native select element:
```tsx
<select
  id="new-owner"
  value={selectedNewOwner}
  onChange={(e) => setSelectedNewOwner(e.target.value)}
  className="w-full rounded-md border px-3 py-2"
>
  <option value="">Choose a member...</option>
  {/* options */}
</select>
```

#### Locations

**Workspace Settings:**
- `/app/workspace/[workspaceId]/settings/workspace-settings-client.tsx:509-522` - Transfer ownership member selector

**Potential Future Usage:**
- Folder picker in move document dialog
- Sort options in document lists
- Filter dropdowns
- Theme selector

#### Implementation Notes
- Custom styling (native select is limited)
- Search/filter capability for long lists
- Keyboard navigation
- Custom option rendering (avatars, icons, etc.)
- Multi-select variant (future)
- Clearable option

---

### 12. Spinner Component

**Priority:** P2 (Enhancement)
**Estimated Instances:** 5+
**Shadcn Variants Needed:** default, sizes

#### Current State
Various loading state implementations:
```tsx
// Button loading text
{loading ? 'Signing in...' : 'Sign in'}
{loading ? 'Creating...' : 'Create'}

// Page loading
<div className="text-sm text-foreground/60">Loading...</div>

// Spinner animation (invite page)
<div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
```

#### Locations

**Button Loading States:**
- All form submit buttons show loading text
- Modal action buttons show loading text

**Page Loading:**
- `/app/invite/[token]/invite-accept-client.tsx:201-206` - Validation loading spinner
- Suspense fallbacks show text-only loading

**Data Loading:**
- `/app/workspace/[workspaceId]/settings/workspace-settings-client.tsx:404-405` - Loading invitation link
- Various "Loading..." text throughout

#### Implementation Notes
- Size variants: xs, sm, md, lg
- Inline spinner (for buttons)
- Page-level spinner (centered)
- Color variants to match context
- Option to show with text label
- Accessibility (aria-label, role)

---

### 13. Toast Component

**Priority:** P2 (Enhancement - NEW)
**Estimated Instances:** 0 (replacement for alerts)
**Shadcn Variants Needed:** default, success, error, info

#### Current State
No toast system - currently using:
- Inline alerts that remain on page
- `alert()` and `confirm()` calls
- Session storage for success messages

#### Proposed Locations
Replace current alert patterns with toast:
- Document operations (duplicate, archive, restore, delete)
- Workspace operations (create, rename, delete)
- Profile updates
- Invitation actions
- Error notifications

#### Implementation Notes
- Global toast provider at app level
- Position: bottom-right or top-right
- Auto-dismiss with configurable timeout
- Swipe to dismiss (mobile)
- Action buttons in toast (undo, view, etc.)
- Queue/stack multiple toasts
- Pause on hover
- Accessibility announcements

---

### 14. Skeleton Component

**Priority:** P3 (Future Enhancement - NEW)
**Estimated Instances:** 0 (improvement over "Loading...")
**Shadcn Variants Needed:** default, sizes

#### Current State
No skeleton loaders - text-based loading states

#### Proposed Locations
- Dashboard workspace list while loading
- Document grid while loading
- Profile page while loading
- Settings page sections while loading

#### Implementation Notes
- Match shape of content (card, list item, text block)
- Pulsing animation
- Combine multiple skeleton pieces to match layout
- Progressive loading (show skeleton, then content)

---

### 15. Tooltip Component

**Priority:** P3 (Future Enhancement - NEW)
**Estimated Instances:** 0 (accessibility improvement)
**Shadcn Variants Needed:** default

#### Current State
No tooltips - button titles sometimes used

#### Proposed Locations
- Icon-only buttons (archive link icon, create folder icon)
- Truncated text (long document names, workspace names)
- Help text/explanations
- Keyboard shortcuts hints

#### Implementation Notes
- Hover delay
- Keyboard accessible (focus shows tooltip)
- Position awareness
- Don't block interactions
- Short, descriptive text only

---

## Component Dependencies & Implementation Order

### Phase 1: Foundation (Week 1)
**CRITICAL - All future work depends on these**

1. **Button** (P0)
   - No dependencies
   - Used by all other components
   - Establish variant patterns

2. **Input** (P0)
   - No dependencies
   - Used by Form, Dialog
   - Establish validation patterns

3. **Label** (P0)
   - No dependencies
   - Used by Form, Input
   - Establish typography patterns

4. **Dialog** (P0)
   - Depends on: Button
   - Used throughout app for confirmations
   - Establish modal patterns

### Phase 2: Forms & Validation (Week 2)
**Build on foundation, enable consistent form handling**

5. **Form** (P1)
   - Depends on: Input, Label, Button
   - Establishes validation patterns
   - React Hook Form integration

6. **Alert** (P1)
   - No dependencies
   - Used by Form for errors
   - Establish feedback patterns

7. **Badge** (P1)
   - No dependencies
   - Quick win, low complexity

### Phase 3: Layout & Navigation (Week 3)
**Improve information hierarchy**

8. **Card** (P1)
   - No dependencies
   - Improves visual consistency

9. **Separator** (P2)
   - No dependencies
   - Quick win, low complexity

10. **Dropdown Menu** (P2)
    - Depends on: Button
    - Replaces ActionMenu

### Phase 4: Advanced Interactions (Week 4+)
**Polish and enhanced UX**

11. **Select** (P2)
    - Depends on: Dropdown Menu patterns
    - Complex but isolated usage

12. **Toast** (P2)
    - Depends on: Alert patterns
    - New feature, big UX improvement

13. **Spinner** (P2)
    - No dependencies
    - Replace loading text patterns

14. **Skeleton** (P3)
    - No dependencies
    - Progressive loading enhancement

15. **Tooltip** (P3)
    - No dependencies
    - Accessibility enhancement

---

## File-Level Impact Analysis

### High Impact Files (10+ replacements)
These files will see the most changes and should be refactored carefully:

1. **`/app/dashboard/dashboard-client.tsx`** (150+ lines affected)
   - 5 Dialogs (modals)
   - 10+ Buttons
   - 8+ Inputs
   - 3+ Alerts
   - 2+ Cards
   - 6+ Labels

2. **`/app/workspace/[workspaceId]/workspace-browser-client.tsx`** (100+ lines affected)
   - 2 Dialogs
   - 8+ Buttons
   - 4+ Inputs
   - Multiple Card-like structures

3. **`/app/workspace/[workspaceId]/settings/workspace-settings-client.tsx`** (120+ lines affected)
   - 8+ Buttons
   - 3+ Inputs
   - 1 Select
   - 5+ Cards (section containers)
   - 2+ Badges
   - Multiple Alerts

### Medium Impact Files (5-10 replacements)

4. **`/app/login/page.tsx`** (50+ lines affected)
5. **`/app/signup/page.tsx`** (70+ lines affected)
6. **`/app/profile/profile-client.tsx`** (50+ lines affected)
7. **`/app/forgot-password/page.tsx`** (40+ lines affected)
8. **`/app/reset-password/page.tsx`** (40+ lines affected)
9. **`/components/documents/DocumentCard.tsx`** (30+ lines affected)
10. **`/components/documents/DocumentActions.tsx`** (entire file replacement)

### Low Impact Files (1-4 replacements)

11. **`/components/shared/ActionMenu.tsx`** (replace with Dropdown Menu)
12. **`/components/folders/FolderTree.tsx`** (minor button updates)
13. **`/app/invite/[token]/invite-accept-client.tsx`** (buttons, alerts)

---

## Anti-Patterns to Avoid

Based on the audit, avoid these patterns when implementing shadcn:

### 1. Inline Styling Duplication
**Current Problem:**
```tsx
// Login button
className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 focus:outline-none focus:ring-2 focus:ring-foreground/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"

// Dashboard button (slightly different)
className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90"
```

**Solution:** Use shadcn Button component with consistent props

### 2. Custom Modal Implementations
**Current Problem:** Each modal reimplements backdrop, positioning, escape handling

**Solution:** Use shadcn Dialog component with consistent patterns

### 3. Manual Form Validation
**Current Problem:** Each form manually manages validation state

**Solution:** Use shadcn Form component with React Hook Form integration

### 4. Inconsistent Alert Styling
**Current Problem:** Different color combinations and structures for errors/success

**Solution:** Use shadcn Alert component with consistent variants

### 5. Window Confirm/Prompt Usage
**Current Problem:**
```tsx
const newName = window.prompt('Enter new name:', document.name)
if (window.confirm('Are you sure?')) { ... }
```

**Solution:** Use shadcn Dialog component for all confirmations

---

## Testing Strategy

### Component Testing Requirements
Each shadcn component integration must include:

1. **Visual regression tests** - Screenshots before/after
2. **E2E test updates** - Update selectors, verify interactions still work
3. **Accessibility tests** - Keyboard navigation, screen reader support
4. **Dark mode tests** - Verify in both light and dark themes

### Critical E2E Test Files to Update

**After Button component:**
- `/e2e/auth.spec.ts` - Login/signup buttons
- `/e2e/workspace.spec.ts` - Workspace operations
- `/e2e/document.spec.ts` - Document operations

**After Dialog component:**
- `/e2e/workspace.spec.ts` - Modal interactions
- `/e2e/document.spec.ts` - Confirmation dialogs

**After Form component:**
- `/e2e/auth.spec.ts` - Form submissions
- `/e2e/profile.spec.ts` - Profile updates

---

## Accessibility Improvements

shadcn/ui will improve accessibility in these areas:

### Current Gaps
- No focus management in custom modals
- Inconsistent keyboard navigation
- Missing ARIA labels on icon buttons
- No announcements for dynamic content changes
- Inconsistent focus indicators

### shadcn Improvements
✅ Built-in focus trap for Dialogs
✅ Keyboard navigation for Dropdowns
✅ ARIA attributes on all interactive elements
✅ Screen reader announcements for toasts
✅ High contrast mode support
✅ Focus visible indicators

---

## Next Steps

1. ✅ **Component Inventory** - COMPLETE
2. 🔄 **Create Implementation Tickets** - IN PROGRESS
   - DESIGN-06-A: Button Component Integration
   - DESIGN-06-B: Input Component Integration
   - DESIGN-06-C: Label Component Integration
   - DESIGN-06-D: Dialog Component Integration
   - DESIGN-06-E: Form Component Integration
   - (Continue for all P0-P1 components)
3. ⏳ **Set Up Infrastructure** - PENDING
   - Install shadcn/ui
   - Configure Tailwind theme
   - Create component library folder structure
4. ⏳ **Create Frontend Guide** - PENDING
   - Component usage patterns
   - Migration strategy
   - Code examples
5. ⏳ **Begin Implementation** - PENDING
   - Start with Button (P0)
   - Proceed in dependency order

---

## Appendix: Pattern Examples

### Current Button Patterns
```tsx
// Primary
className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:bg-foreground/90"

// Destructive
className="rounded-md bg-red-500 text-white px-4 py-2 text-sm font-medium hover:opacity-90"
className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"

// Secondary/Outline
className="rounded-md border border-foreground/20 px-4 py-2 text-sm hover:bg-foreground/5"
className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"

// Ghost/Link
className="text-sm hover:underline"
className="text-sm text-foreground/60 hover:text-foreground hover:underline"
```

### Current Input Patterns
```tsx
// Standard
className="w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/40"

// Error
className="w-full px-3 py-2 rounded-md border border-red-500 bg-background mb-2"

// Disabled
className="w-full rounded-md border border-foreground/20 bg-foreground/5 px-3 py-2 text-sm text-foreground/60 cursor-not-allowed"
```

### Current Alert Patterns
```tsx
// Error
className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-800 dark:text-red-200"

// Success
className="rounded-md bg-green-50 dark:bg-green-900/20 p-4 text-sm text-green-800 dark:text-green-200"

// Info
className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 text-blue-800 dark:text-blue-200"

// Warning
className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-3 text-sm text-yellow-800 dark:text-yellow-200"
```

---

**Document Status:** Complete and ready for ticket creation
**Last Updated:** 2025-01-16
**Next Review:** After implementation of P0 components
