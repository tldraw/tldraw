# DESIGN-06: Integrate shadcn/ui Components

Date created: 2025-10-05
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

Replace bespoke form elements, buttons, and UI components throughout the application with standardized shadcn/ui components. This will improve consistency, accessibility, maintainability, and provide better user experience through battle-tested component patterns.

Currently, the application uses custom-styled native HTML elements (inputs, buttons, textareas) with Tailwind classes. While functional, these lack the polish, accessibility features, and advanced functionality that shadcn/ui components provide.

## Acceptance Criteria

- [ ] All buttons replaced with shadcn Button component (with appropriate variants: default, destructive, outline, ghost, link)
- [ ] All form inputs replaced with shadcn Input component
- [ ] All forms use shadcn Form component with React Hook Form integration
- [ ] All modals/dialogs replaced with shadcn Dialog component
- [ ] Success/error messages replaced with shadcn Alert component
- [ ] All labels use shadcn Label component
- [ ] Loading states use shadcn Skeleton or appropriate loading patterns
- [ ] Existing functionality and tests continue to work without modification
- [ ] Accessibility improvements are verified (keyboard navigation, screen readers)
- [ ] Dark mode support is maintained

## Technical Details

### Components to Install

Based on shadcn/ui documentation, install and configure:

1. **Button** - For all button elements
2. **Input** - For text, email, password inputs
3. **Form** + **Label** - For form structure with React Hook Form
4. **Dialog** - For modals (create/rename/delete workspace, etc.)
5. **Alert** - For error/success messages
6. **Card** - For content containers (dashboard sections, profile settings)
7. **Separator** - For visual dividers

Optional enhancements:

- **Toast** - For temporary success/error notifications
- **Skeleton** - For loading states
- **Badge** - For status indicators (private/shared workspaces)

### Files Requiring Updates

**Authentication Pages:**

- `/app/login/page.tsx` - Email/password inputs, submit button, error alerts
- `/app/signup/page.tsx` - Name/email/password inputs, submit button, error/hint alerts
- `/app/forgot-password/page.tsx` - Email input, submit button, success/error alerts
- `/app/reset-password/page.tsx` - Password input, submit button (assumed exists)

**Dashboard:**

- `/app/dashboard/dashboard-client.tsx` - Multiple buttons (create/rename/delete workspace, logout), modals, inputs, workspace cards

**Profile:**

- `/app/profile/profile-client.tsx` - Form inputs (name, display name), submit button, success/error alerts, card container

### Implementation Steps

1. **Setup shadcn/ui**

   ```bash
   npx shadcn@latest init
   ```

   Configure with existing Tailwind setup and theme

2. **Install Required Components**

   ```bash
   npx shadcn@latest add button input form label dialog alert card
   ```

3. **Create Form Wrappers** (if needed)
   - Set up React Hook Form integration with shadcn Form component
   - Create reusable form field patterns

4. **Refactor by Priority**
   - Start with authentication pages (most used, simplest forms)
   - Move to profile page
   - Finish with dashboard (most complex, multiple modals)

5. **Maintain Test Compatibility**
   - Ensure all `data-testid` attributes are preserved
   - Verify Playwright tests pass without modification

### API/Component Patterns

**Before (Current):**

```tsx
<input
	type="email"
	value={email}
	onChange={(e) => setEmail(e.target.value)}
	className="w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/40"
	data-testid="email-input"
/>
```

**After (shadcn):**

```tsx
<Form {...form}>
	<FormField
		control={form.control}
		name="email"
		render={({ field }) => (
			<FormItem>
				<FormLabel>Email address</FormLabel>
				<FormControl>
					<Input {...field} type="email" data-testid="email-input" />
				</FormControl>
				<FormMessage />
			</FormItem>
		)}
	/>
</Form>
```

**Dialog Pattern (for modals):**

```tsx
<Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Create New Workspace</DialogTitle>
		</DialogHeader>
		{/* Form content */}
	</DialogContent>
</Dialog>
```

### Permissions/Security

No security implications - this is purely a UI refactor. Ensure:

- Form validation logic is preserved
- Data submission flows remain unchanged
- No new client-side data exposure

## Dependencies

- shadcn/ui library and dependencies (React Hook Form, Radix UI primitives)
- Existing Tailwind configuration
- No blocking dependencies on other tickets

## Testing Requirements

- [x] Unit tests - Not required (component library is tested)
- [ ] Integration tests - Verify form submissions still work
- [x] E2E tests (Playwright) - Existing tests should pass without modification
- [ ] Manual testing scenarios:
  - Test all authentication flows (login, signup, forgot password)
  - Test all dashboard operations (create/rename/delete workspace)
  - Test profile update flow
  - Verify keyboard navigation works
  - Test dark mode appearance
  - Verify loading and error states

## Related Documentation

- shadcn/ui docs: https://ui.shadcn.com/docs/components
- Product spec: See product.md - UI/UX sections
- Current component locations: All in `apps/simple-dotcom/simple-client/src/app/`

## Notes

### Current Component Inventory

**Buttons:**

- Sign in/Sign up buttons (auth pages)
- Create/Rename/Delete workspace buttons (dashboard)
- Save changes button (profile)
- Sign out button (dashboard)
- Modal action buttons (Create/Rename/Delete/Cancel)

**Inputs:**

- Email inputs (login, signup, forgot-password, profile)
- Password inputs (login, signup, reset-password)
- Text inputs (name, display name, workspace name)

**Alerts:**

- Error messages (red background, all pages)
- Success messages (green background, profile, forgot-password)
- Inline hints (password strength, profile help text)

**Modals:**

- Create workspace modal (dashboard)
- Rename workspace modal (dashboard)
- Delete workspace modal (dashboard)

**Cards/Containers:**

- Profile settings container
- Dashboard welcome card
- Recent documents list
- Workspace items

### Design Considerations

- Maintain current color scheme (foreground/background CSS variables)
- Preserve responsive behavior
- Keep existing spacing and layout
- Ensure components integrate with existing Tailwind utilities

### Migration Strategy

Consider migrating incrementally:

1. Auth pages first (independent, high visibility)
2. Profile page (single user, less complex)
3. Dashboard last (most complex, multiple modals, state management)

This allows for testing and refinement before tackling the most complex page.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

[Track progress, decisions, and blockers as work proceeds. Each entry should include date and brief description.]

## Open questions

1. Should we use shadcn Toast for success messages instead of inline Alert components?
2. Should we add Skeleton loading states where currently showing "Loading..." text?
3. Do we want to add form validation using zod + React Hook Form schemas?
4. Should we extract common form patterns into reusable components?
