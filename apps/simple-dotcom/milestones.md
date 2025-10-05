# Simple tldraw App – MVP Milestones

## Purpose

Break the MVP scope into three executable milestones that sequence dependencies, focus parallel work, and provide clear entry/exit criteria. Each milestone groups the Git-based tickets in `apps/simple-dotcom/tickets/` that must be delivered before moving to the next milestone.

## Milestone 1 – Platform Foundations

**Goal:** Establish core infrastructure so a single user can authenticate, land in the product shell, and manage personal/shared workspaces under enforced access control.

**Primary outcomes:**
- Supabase schema and API scaffolded with RLS-ready policies.
- Email/password auth, password recovery, and private workspace provisioning with validation guardrails.
- Workspace CRUD with owner safeguards and initial dashboard/navigation shell, including recent documents.

**Ticket checklist:**
- [x] [`tickets/TECH-01-supabase-schema-foundation.md`](tickets/TECH-01-supabase-schema-foundation.md)
- [~] [`tickets/TECH-04-api-surface-area.md`](tickets/TECH-04-api-surface-area.md) *(In Progress: API routes done, integration tests blocked on AUTH-01)*
- [x] [`tickets/AUTH-01-implement-email-authentication-flows.md`](tickets/AUTH-01-implement-email-authentication-flows.md)
- [x] [`tickets/AUTH-02-provision-private-workspace-on-signup.md`](tickets/AUTH-02-provision-private-workspace-on-signup.md)
- [x] [`tickets/TEST-01-playwright-e2e-suite.md`](tickets/TEST-01-playwright-e2e-suite.md)
- [x] [`tickets/TEST-04-playwright-data-isolation.md`](tickets/TEST-04-playwright-data-isolation.md)
- [x] [`tickets/AUTH-03-password-recovery-flow.md`](tickets/AUTH-03-password-recovery-flow.md)
- [x] [`tickets/AUTH-04-basic-user-profiles.md`](tickets/AUTH-04-basic-user-profiles.md)
- [x] [`tickets/AUTH-05-private-workspace-validation-rules.md`](tickets/AUTH-05-private-workspace-validation-rules.md)
- [x] [`tickets/WS-01-shared-workspace-crud.md`](tickets/WS-01-shared-workspace-crud.md)
- [x] [`tickets/WS-02-owner-deletion-constraints.md`](tickets/WS-02-owner-deletion-constraints.md)
- [x] [`tickets/PERM-01-workspace-access-control.md`](tickets/PERM-01-workspace-access-control.md)
- [x] [`tickets/NAV-02-global-dashboard.md`](tickets/NAV-02-global-dashboard.md)
- [x] [`tickets/TECH-08-server-component-data-fetching.md`](tickets/TECH-08-server-component-data-fetching.md)
- [x] [`tickets/NAV-07-recent-documents-tracking-and-display.md`](tickets/NAV-07-recent-documents-tracking-and-display.md)
- [x] [`tickets/NAV-05-route-structure-and-guards.md`](tickets/NAV-05-route-structure-and-guards.md)

## Milestone 1.5 – Critical Fixes & Auth Bridge ⚠️ BLOCKS M2

**Goal:** Resolve fundamental auth/data integrity issues discovered during M1 that prevent M2 from functioning correctly.

**⚠️ CRITICAL:** These tickets MUST be completed before starting Milestone 2. M2 features will not work without this foundation.

**Primary outcomes:**
- Better Auth sessions properly bridge to Supabase RLS for secure data access (M15-01 is the critical blocker)
- Dashboard and API routes handle edge cases without crashes
- Ownership transfer maintains data integrity
- Session validation prevents redirect loops

**Ticket checklist:**
- [x] [`tickets/M15-05-surface-backend-logs-to-agents.md`](tickets/M15-05-surface-backend-logs-to-agents.md) *(Medium, 1-3 days)*
- [x] [`tickets/M15-01-migrate-to-supabase-auth.md`](tickets/M15-01-migrate-to-supabase-auth.md) *(Large, 3-5 days - **CRITICAL PATH** - COMPLETED 2025-10-05)*
- [x] [`tickets/M15-02-handle-empty-workspace-lists.md`](tickets/M15-02-handle-empty-workspace-lists.md) *(Small, < 1 day - COMPLETED 2025-10-05)*
- [x] [`tickets/M15-03-make-ownership-transfer-atomic.md`](tickets/M15-03-make-ownership-transfer-atomic.md) *(Medium, 1-3 days - COMPLETED 2025-10-05)*
- [x] [`tickets/M15-04-harden-route-middleware-session-validation.md`](tickets/M15-04-harden-route-middleware-session-validation.md) *(Medium, 1-3 days - COMPLETED 2025-10-05)*
- [x] [`tickets/M15-06-fix-tests-for-auto-provisioning.md`](tickets/M15-06-fix-tests-for-auto-provisioning.md) *(Small, < 1 day - COMPLETED 2025-10-05)*
- [x] **BUG-01** [`bugs/BUG-01-workspace-creation-foreign-key-constraint.md`](bugs/BUG-01-workspace-creation-foreign-key-constraint.md) *(RESOLVED 2025-10-05 - Critical auth.users sync issue)*

**Status:** ✅ **COMPLETE** (2025-10-05)

**Estimated timeline:** 1-2 weeks (some parallelization possible after M15-01 complete)

**Achievement Summary:**
- Successfully migrated from Better Auth to Supabase Auth (36 files modified)
- Implemented database triggers for auth.users → public.users sync with auto-workspace provisioning
- Resolved critical foreign key constraint issues (BUG-01)
- Added atomic ownership transfer using database functions
- Hardened session validation to prevent redirect loops
- Fixed E2E test suite to reflect AUTH-02 auto-provisioning behavior
- All 94 E2E tests passing (3 skipped)

## Milestone 2 – Collaboration & Organization (Canvas-Agnostic)

**Goal:** Enable teams to collaborate inside shared workspaces with full document and folder management, treating documents as opaque files. Build all application-level features that don't require canvas integration.

**Strategic Approach:** Defer tldraw/canvas integration to M2B or M3. This de-risks M2 by focusing on workspace/document management, permissions, sharing, and navigation without the complexity of real-time canvas sync.

**Primary outcomes:**
- Workspace settings, archives, and membership management (including invite lifecycle)
- Document/folder CRUD with hierarchy enforcement (documents treated as files with metadata)
- Role-aware navigation, sharing with guest access, and search across workspaces
- Permission system that will support canvas integration when added later

**Refinements applied (2025-10-05):**
- **DEFERRED to Milestone 2.5:** All tldraw/canvas tickets (COLLAB-01A/B, COLLAB-02, COLLAB-03, TECH-02)
- Split NAV-04 → NAV-04A (member view) + NAV-04B (guest view) - simplified without canvas
- Combined INV-01 + INV-02 → unified invitation acceptance flow
- Combined PERM-02 + PERM-04 → unified document sharing system
- Scoped SEC-01 to auth + invite endpoints only (M2 essentials)
- Added TECH-09 (realtime architecture for app-level updates) and DESIGN-07 (component library)

**Estimated timeline:** 4-5 weeks with 2-3 engineers (reduced from 6-8 weeks by removing canvas work)

**Ticket checklist (21 tickets, canvas-agnostic only):**

### Phase 1: Foundation & Simple CRUD (Week 1-2)
*Start these in parallel after M1.5 complete*
- [x] [`tickets/TECH-09-realtime-update-architecture.md`](tickets/TECH-09-realtime-update-architecture.md) *(Small, < 1 day)* ✅ COMPLETED 2025-10-05
- [x] [`tickets/DESIGN-07-shared-component-library.md`](tickets/DESIGN-07-shared-component-library.md) *(Small, 1-2 days)* ✅ COMPLETED 2025-10-05
- [x] [`tickets/DOC-04-document-metadata-tracking.md`](tickets/DOC-04-document-metadata-tracking.md) *(Small)* ✅ COMPLETED 2025-10-05
- [x] [`tickets/DOC-01-document-crud-and-archive.md`](tickets/DOC-01-document-crud-and-archive.md) *(Medium - metadata only, no canvas)* ✅ COMPLETED 2025-10-05
- [x] [`tickets/DOC-05-archive-hard-delete-policies.md`](tickets/DOC-05-archive-hard-delete-policies.md) *(Small)* ✅ COMPLETED 2025-10-05
- [x] [`tickets/MEM-05-member-limit-guardrails.md`](tickets/MEM-05-member-limit-guardrails.md) *(Small)* ✅ COMPLETED 2025-10-05
- [x] [`tickets/WS-03-member-settings-and-leave-flow.md`](tickets/WS-03-member-settings-and-leave-flow.md) *(Small)* ✅ COMPLETED 2025-10-05

### Phase 2: Workspace Collaboration (Week 2-3)
- [ ] [`tickets/MEM-01-role-management-and-ownership-transfer.md`](tickets/MEM-01-role-management-and-ownership-transfer.md) *(Medium)*
- [ ] [`tickets/MEM-02-member-directory-and-removal.md`](tickets/MEM-02-member-directory-and-removal.md) *(Medium)*
- [ ] [`tickets/MEM-03-invitation-link-lifecycle.md`](tickets/MEM-03-invitation-link-lifecycle.md) *(Medium)*
- [ ] [`tickets/MEM-04-join-workspace-by-invite-link.md`](tickets/MEM-04-join-workspace-by-invite-link.md) *(Medium)*
- [ ] [`tickets/INV-01-invitation-acceptance-flow.md`](tickets/INV-01-invitation-acceptance-flow.md) *(Small-Medium, combined)*
- [ ] [`tickets/WS-04-workspace-archive-management.md`](tickets/WS-04-workspace-archive-management.md) *(Medium)*
- [ ] [`tickets/SEC-01-rate-limiting-and-abuse-prevention.md`](tickets/SEC-01-rate-limiting-and-abuse-prevention.md) *(Small-Medium)*

### Phase 3: Documents & Folders (Week 3-4)
- [ ] [`tickets/TECH-05-folder-ancestry-validation.md`](tickets/TECH-05-folder-ancestry-validation.md) *(Medium)*
- [ ] [`tickets/DOC-02-folder-hierarchy-and-cycle-prevention.md`](tickets/DOC-02-folder-hierarchy-and-cycle-prevention.md) *(Large - COMPLEX)*
- [ ] [`tickets/DOC-03-document-move-operations.md`](tickets/DOC-03-document-move-operations.md) *(Medium)*
- [ ] [`tickets/NAV-03-workspace-browser.md`](tickets/NAV-03-workspace-browser.md) *(Medium)*

### Phase 4: Document Views & Sharing (Week 4-5)
*Document views show file metadata/preview only - no canvas rendering*
- [ ] [`tickets/NAV-04A-member-document-view.md`](tickets/NAV-04A-member-document-view.md) *(Medium - simplified without canvas)*
- [ ] [`tickets/PERM-02-document-sharing-system.md`](tickets/PERM-02-document-sharing-system.md) *(Medium, combined)*
- [ ] [`tickets/NAV-04B-guest-document-view.md`](tickets/NAV-04B-guest-document-view.md) *(Medium - simplified without canvas)*
- [ ] [`tickets/PERM-03-guest-access-experience.md`](tickets/PERM-03-guest-access-experience.md) *(Medium)*

### Phase 5: Search & Polish (Week 5)
- [ ] [`tickets/NAV-06-document-search.md`](tickets/NAV-06-document-search.md) *(Medium)*

**Deferred to M2B or M3 (Canvas Integration Phase - 8 tickets):**
- [`tickets/TECH-02-tldraw-storage-and-snapshots.md`](tickets/TECH-02-tldraw-storage-and-snapshots.md) *(Large - R2 snapshots)*
- [`tickets/COLLAB-01A-basic-tldraw-integration.md`](tickets/COLLAB-01A-basic-tldraw-integration.md) *(Medium - tldraw component)*
- [`tickets/COLLAB-01B-multiplayer-sync-worker.md`](tickets/COLLAB-01B-multiplayer-sync-worker.md) *(Large - sync worker + WebSockets)*
- [`tickets/COLLAB-02-presence-indicators.md`](tickets/COLLAB-02-presence-indicators.md) *(Medium - canvas cursors/presence)*
- [`tickets/COLLAB-03-offline-resilience.md`](tickets/COLLAB-03-offline-resilience.md) *(Medium - offline canvas sync)*
- [`tickets/TECH-06-offline-status-detection.md`](tickets/TECH-06-offline-status-detection.md) *(Medium - supports canvas offline)*

**Canvas-agnostic implementation notes:**
- Documents are files with metadata (name, creator, timestamps, sharing settings)
- Document view shows file info panel with metadata, permissions, sharing controls
- No canvas rendering - simple file/metadata display
- Guest view similarly shows document metadata without canvas
- Permission system architecture supports future canvas integration
- This validates entire workspace/permission/sharing flow before adding canvas complexity

**Superseded tickets:**
- ~~INV-01 + INV-02~~ → Combined into new INV-01
- ~~PERM-02 + PERM-04~~ → Combined into new PERM-02

## Milestone 2.5 – Canvas Integration Foundation

**Goal:** Deliver the first canvas-capable experience by layering tldraw editing, real-time sync, and offline resilience on top of the Milestone 2 workspace/document system.

**Strategic Approach:** Reuse the production dotcom integration as the blueprint while carving out a simplified worker + client surface for the simple-dotcom stack. Build the integration incrementally: local canvas → multiplayer sync → resilience and UX polish.

**Primary outcomes:**
- `/d/[documentId]` renders `<Tldraw />` for members with role-aware read/write behaviour for guests.
- Cloudflare Durable Object worker manages multiplayer sessions, Supabase-backed permissions, and autosave snapshots.
- R2 snapshot pipeline writes and restores document state without blocking editing flows.
- Presence, offline banners, and reconnection UX match product expectations without regressing Milestone 2 behaviours.

**Prerequisites:** Milestone 2 tickets complete, Supabase auth/permissions stable, and Cloudflare credentials (Workers, Durable Objects, R2) provisioned.

**Estimated timeline:** 3–4 weeks with 2 engineers (COLLAB-01B + TECH-02 on the critical path).

**Ticket checklist (Canvas integration):**
- [ ] [`tickets/COLLAB-01A-basic-tldraw-integration.md`](tickets/COLLAB-01A-basic-tldraw-integration.md) *(Medium)*
- [ ] [`tickets/TECH-02-tldraw-storage-and-snapshots.md`](tickets/TECH-02-tldraw-storage-and-snapshots.md) *(Large)*
- [ ] [`tickets/COLLAB-01B-multiplayer-sync-worker.md`](tickets/COLLAB-01B-multiplayer-sync-worker.md) *(Large)*
- [ ] [`tickets/COLLAB-02-presence-indicators.md`](tickets/COLLAB-02-presence-indicators.md) *(Medium)*
- [ ] [`tickets/COLLAB-03-offline-resilience.md`](tickets/COLLAB-03-offline-resilience.md) *(Medium)*
- [ ] [`tickets/TECH-06-offline-status-detection.md`](tickets/TECH-06-offline-status-detection.md) *(Medium)*

### Ticket Guidance

- **COLLAB-01A** – Replace the placeholder canvas in `apps/simple-dotcom/simple-client/src/app/d/[documentId]/document-view-client.tsx` with the `<Tldraw />` component. Start with the minimal patterns in `apps/examples/src/examples/inline/InlineExample.tsx` and `apps/examples/src/misc/develop.tsx` to understand required providers. Use `persistenceKey={document.id}` so IndexedDB stores per-document state, and gate editability via the existing `canEdit` flag. Mirror the layout constraints from dotcom (`apps/dotcom/client/src/tla/components/TlaEditor/TlaEditor.tsx`) so the canvas stretches under the document header, and introduce a feature flag so the route can fall back to read-only while COLLAB-01B lands.
- **TECH-02** – Extend Supabase with `snapshot_key`, `last_snapshot_at`, and `snapshot_version` on `documents` (follow the migration style under `apps/simple-dotcom/supabase/migrations`). Reuse the R2 helpers from `apps/dotcom/sync-worker/src/r2.ts` and `snapshotUtils.ts` to implement `writeSnapshotWithRetry` inside the new worker. Share snapshot key formatting via a small module in `apps/simple-dotcom/simple-shared` so both worker and client agree on `documents/{workspace_id}/{document_id}/latest.json`. Update `apps/simple-dotcom/simple-client/src/app/d/[documentId]/page.tsx` to request the latest snapshot on load and fall back to an empty canvas when none exists.
- **COLLAB-01B** – Scaffold `apps/simple-dotcom/simple-worker/` using `apps/dotcom/sync-worker` as the reference but strip dotcom-specific routes. Minimum pieces: `wrangler.toml`, a Durable Object managing room state, WebSocket upgrade handling in `src/worker.ts`, and token validation that calls Supabase with a service-role key (copy the pattern from `apps/dotcom/sync-worker/src/utils/tla/getAuth.ts`). Add `apps/simple-dotcom/simple-client/src/app/api/sync/[documentId]/token/route.ts` to issue signed tokens after checking workspace permissions. On the client, swap the local persistence adapter for `useSync` from `@tldraw/sync` (see `apps/dotcom/client/src/tla/components/TlaEditor/TlaEditor.tsx`) and pipe the returned `store` into `<Tldraw />`.
- **COLLAB-02** – Surface live collaborators once sync is active. The tldraw editor will render cursors automatically if tokens include user metadata; extend the token payload in COLLAB-01B with `display_name` and colour hints. For the header participant list, subscribe to Supabase Realtime on the `presence` table using a client helper (build on the existing REST handler at `apps/simple-dotcom/simple-client/src/app/api/presence/[documentId]/route.ts`). Reference `packages/tldraw/src/components/DefaultCollaborators.tsx` for mapping collaborator state into avatars.
- **COLLAB-03** – Connect offline queues to user-facing banners. Leverage `useCollaborationStatus` / `OfflineIndicator` from `tldraw` (see `apps/dotcom/client/src/tla/components/TlaEditor/editor-components/TlaEditorTopPanel.tsx`) and expose clear copy when edits are queued. Ensure reconnect flow replays queued ops via the sync adapter—no bespoke queue needed. Extend Playwright coverage in `apps/simple-dotcom/simple-client/e2e` with a multi-tab offline scenario using `browserContext.setOffline(true)`.
- **TECH-06** – Implement a global connectivity service shared by dashboard and document routes. Create a hook under `apps/simple-dotcom/simple-client/src/hooks/useNetworkStatus.ts` that combines `window.navigator.onLine` events with a heartbeat fetch (add `/api/health` if needed). Provide context in `app/layout.tsx` and display a banner component that reuses the offline styles from `apps/dotcom/client/src/tla/components/TlaEditor/top.module.css` while avoiding workspace-name leaks for guests.

**Testing expectations:** After schema changes run `yarn workspace simple-client gen-types` then `yarn typecheck` at repo root. Multiplayer and offline scenarios require Playwright multi-browser coverage; reuse the patterns in `apps/simple-dotcom/simple-client/e2e` and the sync-focused examples under `apps/examples/src/examples/sync-*` for deterministic assertions.

## Milestone 3 – Launch Hardening & Readiness

**Goal:** Finalize public entry points, performance guardrails, deployment tooling, monitoring, and automated testing to ship the MVP confidently.

**Primary outcomes:**
- Marketing entry point and deployment pipelines for Vercel + Cloudflare Workers.
- Performance instrumentation, guardrails, rate limiting, and comprehensive monitoring.
- Automated testing coverage for core, multiplayer, and permission flows.

**Ticket checklist:**
- [ ] [`tickets/WS-05-workspace-limit-guardrails.md`](tickets/WS-05-workspace-limit-guardrails.md)
- [ ] [`tickets/DOC-06-document-scale-guardrails.md`](tickets/DOC-06-document-scale-guardrails.md)
- [ ] [`tickets/NAV-01-marketing-landing-page.md`](tickets/NAV-01-marketing-landing-page.md)
- [ ] [`tickets/PERF-01-performance-metrics-and-budgets.md`](tickets/PERF-01-performance-metrics-and-budgets.md)
- [ ] [`tickets/PERF-02-realtime-channel-segmentation.md`](tickets/PERF-02-realtime-channel-segmentation.md)
- [ ] [`tickets/PERF-03-permission-cache-with-invalidation.md`](tickets/PERF-03-permission-cache-with-invalidation.md)
- [ ] [`tickets/TECH-03-deployment-and-environment-setup.md`](tickets/TECH-03-deployment-and-environment-setup.md)
- [ ] [`tickets/TECH-07-error-tracking-and-monitoring.md`](tickets/TECH-07-error-tracking-and-monitoring.md)
- [ ] [`tickets/TEST-02-multiplayer-e2e-coverage.md`](tickets/TEST-02-multiplayer-e2e-coverage.md)
- [ ] [`tickets/TEST-03-permission-and-guest-testing.md`](tickets/TEST-03-permission-and-guest-testing.md)

## How to Use This Plan

- Treat the milestones as stage gates; do not open next milestone tickets until exit criteria are satisfied or explicitly descoped.
- Track progress by checking off ticket links and mirroring status in your external tracker if you use one (Linear, Jira, etc.).
- Revisit and adjust milestones if dependencies shift; keep this document version-controlled alongside the product spec.

## Tips for Completing Tickets

Before starting a ticket:
  - Read README.md to understand the repository layout and how to run the application.
  - Read SPECIFICATION.md to understand the product scope and requirements.
  - Read MILESTONES.md to understand the current milestone and the next one.
  - Read the ticket to understand the requirements and acceptance criteria.
  - Read any related documentation in the ticket.

While working on a ticket:
  - Never try to run the `dev` server. It is already running.
  - Use the local supabase database to test the application or view errors.

When completing tickets:
  - Ensure all TypeScript types are up to date and correct. First ensure that any local database migrations have run. Then, sync database types by running `gen-types` from the simple-client directory. Finally, run `yarn typecheck` from the repository root. Fix any errors.
  - Ensure all Playwright tests pass. Running `yarn test:e2e` from the simple-client directory.
