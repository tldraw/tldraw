# [TECH-01]: Supabase Schema Foundation

Date created: 2025-10-04
Date last updated: 2025-10-04
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
- [x] Workspaces
- [x] Documents
- [x] Folders
- [x] Permissions & Sharing
- [ ] Real-time Collaboration
- [ ] UI/UX
- [x] API
- [x] Database
- [ ] Testing
- [x] Infrastructure

## Description

Design and migrate Supabase schema covering users, workspaces, workspace_members, folders, documents, invitation_links, and related constraints to support MVP functionality with RLS readiness.

## Acceptance Criteria

- [ ] Database schema includes required tables, columns, indexes, and foreign keys aligned with product requirements.
- [ ] Migrations created and documented with rollback strategy; local/staging environments seeded with baseline data.
- [ ] Schema supports RLS policies and triggers outlined in related tickets (permissions, metadata, folder hierarchy).

## Technical Details

### Database Schema Changes

- Define tables: `users`, `workspaces`, `workspace_members`, `folders`, `documents`, `invitation_links`, plus supporting indexes and constraints (unique, foreign keys, check constraints).
- Add sequences/UUID generation strategy consistent across tables.

### API Endpoints

- Ensure API layer loads schema types for TypeScript validation (e.g., generated types from Supabase).

### UI Components

- N/A directly, but provide typed clients for front-end use.

### Permissions/Security

- Prepare base RLS configuration enabling policies once PERM-01 implemented.

## Dependencies

- None; this ticket must be completed **before** other backend tickets relying on the schema.

## Testing Requirements

- [ ] Unit tests
- [x] Integration tests
- [ ] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: TECH-01.
- Product spec: product.md > Technical Architecture > Data Model.
- Engineering notes: eng-meeting-notes.md > Technical Implementation Details > Data Model.

## Notes

Document ER diagram and include in repository (`docs/`) for onboarding and future schema discussions.

## Estimated Complexity

- [ ] Small (< 1 day)
- [ ] Medium (1-3 days)
- [x] Large (3-5 days)
- [ ] Extra Large (> 5 days)
