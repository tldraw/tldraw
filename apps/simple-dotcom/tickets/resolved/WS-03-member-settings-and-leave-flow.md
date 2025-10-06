# [WS-03]: Member Settings and Leave Flow

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
- [ ] Database
- [x] Testing
- [ ] Infrastructure

## Description

Allow non-owner members to view workspace settings in read-only mode and leave shared workspaces independently. Ensure UI clearly differentiates member vs owner capabilities and updates membership records when users leave.

## Acceptance Criteria

- [x] Workspace settings page renders read-only state for members without owner permissions, hiding or disabling restricted controls.
- [x] Members can trigger a leave action via UI that calls `/api/workspaces/[id]/leave` and removes their membership while preserving workspace data.
- [x] Post-leave, member is redirected to dashboard with confirmation messaging and workspace removed from their lists.

## Technical Details

### Database Schema Changes

- None.

### API Endpoints

- Implement `/api/workspaces/[id]/leave` endpoint that deletes membership and updates caches/realtime feeds.

### UI Components

- Update settings layout to branch on role; add prominent "Leave workspace" button for members.

### Permissions/Security

- Validate membership existence before processing leave; ensure owners use transfer flow per WS-02.

## Dependencies

- WS-01 workspace CRUD endpoints.
- MEM-02 membership listing for verifying state.

## Testing Requirements

- [ ] Unit tests
- [x] Integration tests
- [x] E2E tests (Playwright) - Added comprehensive tests for leave flow
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: WS-03.
- Product spec: product.md > MVP Scope > Workspace membership.
- Engineering notes: eng-meeting-notes.md > MVP Definition > Workspace membership.

## Notes

Ensure analytics/events track leave actions for potential churn analysis.

## Estimated Complexity

- [x] Small (< 1 day)
- [ ] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

- 2025-10-05: Completed implementation with the following changes:
  - Used existing `/api/workspaces/[workspaceId]/leave` endpoint structure rather than creating new one
  - Enhanced workspace settings client to show clear read-only state for members
  - Added proper error handling for owners attempting to leave (must transfer ownership first)
  - Added protection against leaving private workspaces
  - Implemented success message display on dashboard after successful leave
  - Created comprehensive E2E tests covering all leave scenarios
  - All tests passing, types valid

## Open questions

None - all requirements met.

## Notes from engineering lead

Implementation completed successfully. The leave workspace functionality is fully operational with proper safeguards:
- Members can leave shared workspaces they belong to
- Owners are prevented from leaving and directed to transfer ownership first
- Private workspaces cannot be left
- UI properly shows read-only state for non-owner members
- Success feedback is provided via dashboard notification
- All edge cases are covered with E2E tests
