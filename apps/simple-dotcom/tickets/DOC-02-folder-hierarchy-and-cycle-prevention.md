# [DOC-02]: Folder Hierarchy and Cycle Prevention

Date created: 2025-10-04
Date last updated: -
Date completed: -

## Status

- [x] Not Started
- [ ] In Progress
- [ ] Blocked
- [ ] Done

## Priority

- [x] P0 (MVP Required)
- [ ] P1 (Post-MVP)

## Category

- [ ] Authentication
- [ ] Workspaces
- [ ] Documents
- [x] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [x] API
- [x] Database
- [x] Testing
- [ ] Infrastructure

## Description

Implement folder creation, renaming, deletion, and nesting with adjacency list schema, enforcing maximum depth of 10 levels and preventing cyclic relationships.

## Acceptance Criteria

- [ ] Users can create, rename, and delete folders within workspaces via UI and `/api/workspaces/[id]/folders` endpoints.
- [ ] Folder moves validate against cycle creation and depth limit, returning clear errors when operations are disallowed.
- [ ] Workspace views display nested folder tree with breadcrumbs and drag/drop or move dialog support reflecting hierarchy.

## Technical Details

### Database Schema Changes

- Ensure `folders` table includes `id`, `workspace_id`, `parent_id`, `name`, timestamps with indexes on `workspace_id` and `parent_id`.
- Add database constraint or trigger to prevent cycles if feasible.

### API Endpoints

- Implement CRUD handlers and move endpoint that checks parent ancestry chain before commit.

### UI Components

- Build folder tree component with expand/collapse interactions and context menus.
- Provide breadcrumb navigation reflecting folder hierarchy in workspace view.

### Permissions/Security

- Restrict folder operations to workspace members; enforce workspace boundaries for parent assignment.

## Dependencies

- DOC-03 document moves for cross-folder operations.
- TECH-05 enforcement logic (shared).

## Testing Requirements

- [ ] Unit tests
- [x] Integration tests
- [x] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: DOC-02.
- Product spec: product.md > Document Management > Folder Operations.
- Engineering notes: eng-meeting-notes.md > Feature Complexity > Folder nesting.

## Notes

Consider lazy-loading large folder trees to avoid performance regressions when nearing depth limit.

## Estimated Complexity

- [ ] Small (< 1 day)
- [ ] Medium (1-3 days)
- [x] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

[Track progress, decisions, and blockers as work proceeds. Each entry should include date and brief description.]

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
