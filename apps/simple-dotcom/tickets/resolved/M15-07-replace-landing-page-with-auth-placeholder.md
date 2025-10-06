# [M15-07]: Replace Default Next.js Landing Page with Auth Placeholder

Date created: 2025-10-05
Date last updated: 2025-10-05
Date completed: 2025-10-05

## Status

- [ ] Not Started
- [ ] In Progress
- [ ] Blocked
- [x] Done

## Priority

- [x] P0 (MVP Required)
- [ ] P1 (Post-MVP)

## Category

- [x] Authentication
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

Currently the root landing page (`/`) uses the default Next.js starter page. We need to replace this with a simple placeholder landing page that includes login and sign-up buttons. This will provide a proper entry point for unauthenticated users to access the application.

## Acceptance Criteria

- [x] Root page (`/`) displays a custom landing page instead of the default Next.js template
- [x] Landing page includes a "Log In" button that navigates to the login page
- [x] Landing page includes a "Sign Up" button that navigates to the sign-up page
- [x] Landing page has basic branding/styling consistent with the application
- [x] Page is responsive and works on mobile and desktop viewports
- [x] Authenticated users are redirected to the dashboard (if not already handled by middleware)

## Technical Details

### Database Schema Changes

None.

### API Endpoints

None.

### UI Components

- Replace `apps/simple-dotcom/simple-client/src/app/page.tsx` with custom landing page component
- Include buttons linking to `/login` and `/signup` routes
- Consider basic hero section with application description

### Permissions/Security

- Page should be publicly accessible (no authentication required)
- Consider adding redirect logic if user is already authenticated to send them to `/dashboard`

## Dependencies

- Depends on existing auth routes (`/login`, `/signup`) being functional
- Should align with overall application branding/design system when available

## Testing Requirements

- [x] Unit tests (N/A - server component with no complex logic)
- [x] Integration tests (covered by E2E tests)
- [x] E2E tests (Playwright) - verify navigation to login/signup works
- [x] Manual testing scenarios - test on mobile and desktop

## Related Documentation

- Product spec: `product.md` (if applicable)
- Auth flow documentation

## Notes

- Keep the landing page simple for MVP - can be enhanced later with marketing content
- Ensure the design is clean and professional even as a placeholder
- Consider adding application name/logo if available

## Estimated Complexity

- [x] Small (< 1 day)
- [ ] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

2025-10-05: Completed implementation
- Replaced default Next.js landing page with custom landing page component
- Added "Sign up" and "Log in" buttons that navigate to `/signup` and `/login` respectively
- Implemented server-side redirect for authenticated users to `/dashboard`
- Created comprehensive E2E test suite in `e2e/landing.spec.ts` with 4 tests:
  - Landing page displays correctly with auth buttons
  - Sign up button navigation works
  - Login button navigation works
  - Authenticated users are redirected to dashboard
- All E2E tests passing (4/4)
- Landing page uses consistent styling with existing auth pages
- Page is responsive with mobile-first design using Tailwind CSS

## Open questions

- ~~Should we include any application description/tagline on the landing page?~~ **Answered**: Added simple tagline "A collaborative workspace for your documents and ideas"
- ~~Do we need to add a logo or can we use text-based branding for now?~~ **Answered**: Using text-based branding for MVP
- ~~Should authenticated users be automatically redirected to dashboard?~~ **Answered**: Yes, implemented server-side redirect

## Notes from engineering lead

Implementation is clean and follows existing patterns:
- Used server component with `createClient()` from `@/lib/supabase/server` for authentication check
- Consistent styling with login/signup pages using Tailwind utility classes
- Proper test coverage including redirect behavior for authenticated users
- Landing page loads at `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/src/app/page.tsx`
