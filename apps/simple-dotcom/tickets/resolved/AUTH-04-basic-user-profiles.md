# [AUTH-04]: Basic User Profiles

Date created: 2025-10-04
Date last updated: 2025-10-04
Date completed: 2025-10-04

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
- [x] API
- [x] Database
- [x] Testing
- [ ] Infrastructure

## Description

Implement basic profile management so authenticated users can view and update their name, email (read-only), and display name through a `/profile` route backed by Supabase. Ensure profile data is accessible across the product for display purposes while keeping email addresses private.

## Acceptance Criteria

- [x] `/profile` route shows current profile data with editable name and display name fields and read-only email.
- [x] Update submission persists changes to Supabase `users` table and reflects immediately in UI (sidebar, presence, invitations, etc.).
- [x] Form enforces validation (e.g., max length, non-empty) and surfaces error/success states.
- [x] Application-wide UI uses **display names (or initials)** when showing other users—emails are never exposed beyond the profile page.

## Technical Details

### Database Schema Changes

- Confirm Supabase `users` table includes `name` and `display_name` columns; add migrations if missing.

### API Endpoints

- Build `/api/profile` GET/PUT endpoints requiring authentication.
- Return normalized error objects for validation failures.

### UI Components

- Create profile form using shared form primitives with autosave or explicit save button.
- Display success toast/badge after update.

### Permissions/Security

- Restrict profile access to the authenticated user; no cross-user editing.
- Validate email immutability in API layer.

## Dependencies

- AUTH-01 authentication context and session handling.

## Testing Requirements

- [x] Unit tests
- [x] Integration tests
- [x] E2E tests (Playwright) — add scenarios listed below.
- [x] Manual testing scenarios

### E2E Test Coverage (Playwright)

- Authenticated user loads `/profile`, sees populated read-only email and editable name/display name fields.
- Update display name and confirm dashboard/sidebar/presence badges reflect the new value after navigation without page refresh.
- Submit invalid input (blank or > max length) and assert validation messaging prevents save.
- Refresh after successful save to ensure persisted profile values appear and no stale cache is shown.

## Related Documentation

- Product requirements: product-requirements.md: AUTH-04.
- Product spec: product.md > MVP Scope > P0 Features > User profiles.
- Engineering notes: eng-meeting-notes.md > MVP Definition > User profiles (display names only).

## Notes

Coordinate with presence and invitations tickets to ensure display name updates propagate to real-time payloads.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

### 2025-10-04
- Created `/api/profile` GET/PUT endpoints using Better Auth for session management
- Built `/profile` page with form validation and user-friendly UI
- Added database trigger to set default `display_name` from `name` on user creation
- Updated middleware to protect `/profile` route
- Created comprehensive E2E test suite (7 tests covering all scenarios)
- All E2E tests passing ✅
- Backend already properly uses `display_name` for members and presence APIs

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
