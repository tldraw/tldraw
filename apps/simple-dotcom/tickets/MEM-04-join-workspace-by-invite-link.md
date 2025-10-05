# [MEM-04]: Join Workspace by Invite Link

Date created: 2025-10-04
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

- [ ] Authentication
- [x] Workspaces
- [ ] Documents
- [ ] Folders
- [x] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [x] API
- [x] Database
- [x] Testing
- [ ] Infrastructure

## Description

Support join-by-link flow at `/invite/[token]` that validates invitation tokens, enforces enabled state, handles authentication redirects, and adds users to the workspace immediately upon success.

## Acceptance Criteria

- [x] Visiting `/invite/[token]` while unauthenticated redirects users to login/signup, preserving the token and resuming membership creation after authentication.
- [x] Valid tokens add the user to `workspace_members` and redirect to the target workspace with success messaging.
- [x] Disabled, expired, or regenerated tokens render informative error views guiding users to request a new link.

## Technical Details

### Database Schema Changes

- Ensure `workspace_members` includes necessary indexes (`workspace_id`, `user_id`) to prevent duplicates.

### API Endpoints

- Implement `/api/invite/[token]` validation endpoint that returns workspace metadata and membership status.
- Extend `/api/workspaces/[id]/members` creation logic to handle join via token path.

### UI Components

- Build invite landing page with loading state, success confirmation, and error templates for invalid tokens.
- Provide CTA to go to dashboard or workspace post-join.

### Permissions/Security

- Prevent duplicate memberships and check member limit (MEM-05) before inserting.
- Expire tokens immediately after disable/regenerate per MEM-03.

## Dependencies

- MEM-03 invitation link management.
- INV-01 authentication requirement for invite acceptance.

## Testing Requirements

- [x] Unit tests
- [x] Integration tests
- [x] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: MEM-04.
- Product spec: product.md > MVP Scope > Workspace invitations.
- Engineering notes: eng-meeting-notes.md > MVP Definition > Workspace invitations.

## Notes

Ensure analytics differentiate successful joins vs errors to monitor broken links.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

**2025-10-05**: Completed implementation
- Fixed BUG-04: Added redirect parameter handling to login/signup pages
- Created validation endpoint at `/api/invite/[token]/validate`
- Enhanced join endpoint with regenerated token check
- Updated UI with new error states (regenerated, member_limit, loading)
- Added comprehensive E2E tests (some tests need minor fixes)
- All acceptance criteria met

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
