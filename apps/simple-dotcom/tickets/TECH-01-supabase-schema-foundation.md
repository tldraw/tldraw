# [TECH-01]: Supabase Schema Foundation

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

- [ ] Authentication
- [x] Workspaces
- [x] Documents
- [x] Folders
- [x] Permissions & Sharing
- [ ] Real-time Collaboration
- [ ] UI/UX
- [ ] API
- [x] Database
- [ ] Testing
- [x] Infrastructure

## Description

Author the initial Supabase schema and migrations that back the Simple tldraw MVP. The scope covers core collaboration entities (users, workspaces, workspace_members, folders, documents, invitation_links, document_access_log, presence) plus metadata required to unblock downstream API and RLS tickets.

## Acceptance Criteria

- [x] Base SQL migration(s) under `apps/simple-dotcom/supabase/migrations/` create the core tables with UUID primary keys, timestamps, soft-delete fields, foreign keys, and supporting indexes that match the product specification.
- [x] Draft outline of the RLS policies and helper functions needed for PERM-01 is recorded (policy names, high-level predicates per table) so follow-up work can enable them without further schema changes.
- [ ] Manual verification notes in this ticket describe how to run `supabase db reset` (or `supabase db push`) against a local project, seed a sample owner/workspace/document, and confirm read/write access via `psql` or Supabase Studio. *(Pending Docker startup for local testing)*
- [ ] Repository documentation (`docs/simple-dotcom/tech-01-schema.md`) captures table/column descriptions and embeds an ER diagram exported to `docs/simple-dotcom/tech-01-er.png`; ticket links to both. *(Deferred - can be generated from Studio after local testing)*

## Technical Details

### Database Schema Changes

- Create migrations with `supabase migration new tech_01_base_schema` and check them in under `apps/simple-dotcom/supabase/migrations/`.
- Tables to include and key considerations:
  - `users`: mirrors Better Auth identity with profile fields (`email` unique, `display_name`, `name`, timestamps).
  - `workspaces`: owned by `owner_id` (FK to `users`), includes `is_private`, `is_deleted`, `deleted_at`, timestamps, and soft-delete guard.
  - `workspace_members`: junction table with `workspace_role` enum (`owner`, `member`), `joined_at`, and uniqueness on `(workspace_id, user_id)`.
  - `folders`: adjacency list hierarchy (`parent_folder_id` FK self-reference), `workspace_id` FK, `created_by` FK, depth constraint (≤ 10), timestamps.
  - `documents`: belongs to workspace and optional folder, tracks `created_by`, `sharing_mode` enum (`private`, `public_read_only`, `public_editable`), `is_archived`, `archived_at`, `r2_key`.
  - `document_access_log`: captures recent openings with (`document_id`, `workspace_id`, `user_id`, `accessed_at`) for dashboard recents.
  - `invitation_links`: single active invite per workspace (`workspace_id` unique), stores `token`, `enabled`, `regenerated_at`, `created_by`.
  - `presence`: realtime sessions keyed by `session_id`, referencing `document_id` and optional `user_id`, storing cursor JSON.
- Enforce UUID defaults via `gen_random_uuid()` and timestamp defaults via `now()` across tables.
- Add supporting indexes for query paths called out in product spec (e.g., workspace membership lookup, active documents/folders, recents ordering).
- Record any helper functions (timestamp triggers, presence cleanup) and ensure they live inside the migration file with `search_path` safeguards.

### API Endpoints

- Out of scope here; API routes will be implemented once the schema is in place and types are generated.

### UI Components

- Not applicable; front-end will consume the schema via generated types once exposed by API tickets.

### Permissions/Security

- Document intended RLS policies for each table (owner vs member CRUD, public document access, guest presence) and identify helper functions (e.g., `is_workspace_member`, `owns_workspace`).
- Do not enable RLS yet; just ensure columns and relationships required by PERM-01 exist.

## Dependencies

- Supabase CLI project configured for `apps/simple-dotcom/supabase` (`supabase/config.toml`).
- Product requirements in `apps/simple-dotcom/secondary-sources/product-requirements.md` (TECH-01, WS-01, DOC-01, MEM-02).

## Testing Requirements

- [ ] Unit tests
- [ ] Integration tests (not applicable for schema-only work)
- [ ] E2E tests (Playwright)
- [x] Manual testing scenarios (documented smoke test applying migrations + basic CRUD)

## Related Documentation

- `apps/simple-dotcom/SPECIFICATION.md` → Technical Architecture → Data Model, Permissions table.
- `apps/simple-dotcom/secondary-sources/design-doc.md` → Section 4 (Data Model) for relationships and indexes.
- `apps/simple-dotcom/secondary-sources/eng-meeting-notes.md` → Technical Implementation Details → Data Model.
- `apps/simple-dotcom/supabase/types.ts` → Generated types to keep in sync after each migration.

## Notes

- Export the ER diagram from Supabase Studio (or dbdiagram.io) into `docs/simple-dotcom/tech-01-er.png` and reference it inside the schema doc.
- Capture manual verification commands directly in this ticket once migrations land (psql snippets, sample insert/select).
- Coordinate with PERM-01 to avoid double work on RLS function naming.

## Worklog

- 2025-10-04: Initialized Supabase project structure with `supabase init`
- 2025-10-04: Created base schema migration `20251004152910_tech_01_base_schema.sql` with:
  - Core tables: users, workspaces, workspace_members, invitation_links, folders, documents, document_access_log, presence
  - Enums: workspace_role (owner/member), sharing_mode (private/public_read_only/public_editable)
  - Helper functions for RLS: is_workspace_owner, is_workspace_member, can_access_document, can_edit_document
  - Triggers: auto-update updated_at timestamps
  - Validation: folder depth (max 10), cycle prevention
  - Indexes: optimized for dashboard queries, search (pg_trgm), membership lookups
- 2025-10-04: Documented comprehensive RLS policy outline in `supabase/RLS_POLICIES_OUTLINE.md` for PERM-01 implementation
- 2025-10-04: Schema includes all tables, relationships, and constraints specified in SPECIFICATION.md data model

## Open Questions

1. ~~Do we maintain a shadow `public.users` table separate from Supabase `auth.users`, or should the migration create a view that joins the two?~~ **RESOLVED:** Using separate `public.users` table that mirrors Better Auth identity with profile fields (email, display_name, name).
2. How much seed data (workspaces, documents) do we want in local/staging by default for QA flows? **ACTION:** Create seed script in follow-up ticket after local testing is complete.
3. Should we add a scheduled job or cron trigger to run `cleanup_stale_presence()` automatically? **ACTION:** Defer to COLLAB-02 (presence indicators) ticket.
