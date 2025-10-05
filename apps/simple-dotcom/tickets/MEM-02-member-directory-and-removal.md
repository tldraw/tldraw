# [MEM-02]: Member Directory and Removal

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

Implement member listing UI and API so owners can view all workspace members, see role badges, and remove members when necessary with confirmation and feedback.

## Acceptance Criteria

- [x] `/api/workspaces/[id]/members` returns paginated member data including role, **display name**, joined date, and optional avatar reference with RLS constraints (email only for owners where required but never displayed to non-owners).
- [x] Members page displays list with role indicators and contextual actions (remove for owners, disabled for members) showing **display names/initials instead of raw emails**.
- [x] Removing a member updates database, revokes access in real time, and notifies impacted user if online.

## Technical Details

### Database Schema Changes

- Ensure `workspace_members` includes `joined_at` timestamp to display membership duration.

### API Endpoints

- Implement GET endpoint for member list and DELETE endpoint for removing a member.
- Emit Supabase Realtime events for membership changes to sync UI.

### UI Components

- Build member list table/cards with search/filter options if >10 members.
- Provide confirmation modal for removal with reason copy.

### Permissions/Security

- Only owners can remove members; block removal of last owner unless transfer occurs.

## Dependencies

- MEM-01 to ensure roles tracked correctly.
- COLLAB-02 presence to update state when member removed.

## Testing Requirements

- [ ] Unit tests
- [x] Integration tests
- [x] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: MEM-02.
- Product spec: product.md > MVP Scope > Workspace membership.
- Engineering notes: eng-meeting-notes.md > MVP Definition > Workspace membership (display name usage).

## Notes

Consider delayed removal (e.g., 5s grace period) to allow undo in future iterations; track as backlog item if needed.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

2025-10-05: Enhanced existing member directory with search (>10 members), pagination (10 per page), and real-time updates via Supabase subscriptions. Member removal and API endpoints already existed. Added comprehensive E2E tests covering all member management scenarios.

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
