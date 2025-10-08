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
- [x] [`tickets/resolved/TECH-04-api-surface-area.md`](tickets/resolved/TECH-04-api-surface-area.md) ✅ COMPLETED 2025-10-07
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

- [x] [`tickets/M15-05-surface-backend-logs-to-agents.md`](tickets/M15-05-surface-backend-logs-to-agents.md) _(Medium, 1-3 days)_
- [x] [`tickets/M15-01-migrate-to-supabase-auth.md`](tickets/M15-01-migrate-to-supabase-auth.md) _(Large, 3-5 days - **CRITICAL PATH** - COMPLETED 2025-10-05)_
- [x] [`tickets/M15-02-handle-empty-workspace-lists.md`](tickets/M15-02-handle-empty-workspace-lists.md) _(Small, < 1 day - COMPLETED 2025-10-05)_
- [x] [`tickets/M15-03-make-ownership-transfer-atomic.md`](tickets/M15-03-make-ownership-transfer-atomic.md) _(Medium, 1-3 days - COMPLETED 2025-10-05)_
- [x] [`tickets/M15-04-harden-route-middleware-session-validation.md`](tickets/M15-04-harden-route-middleware-session-validation.md) _(Medium, 1-3 days - COMPLETED 2025-10-05)_
- [x] [`tickets/M15-06-fix-tests-for-auto-provisioning.md`](tickets/M15-06-fix-tests-for-auto-provisioning.md) _(Small, < 1 day - COMPLETED 2025-10-05)_
- [x] **BUG-01** [`bugs/BUG-01-workspace-creation-foreign-key-constraint.md`](bugs/BUG-01-workspace-creation-foreign-key-constraint.md) _(RESOLVED 2025-10-05 - Critical auth.users sync issue)_

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

_Start these in parallel after M1.5 complete_

- [x] [`tickets/TECH-09-realtime-update-architecture.md`](tickets/TECH-09-realtime-update-architecture.md) _(Small, < 1 day)_ ✅ COMPLETED 2025-10-05
- [x] [`tickets/DESIGN-07-shared-component-library.md`](tickets/DESIGN-07-shared-component-library.md) _(Small, 1-2 days)_ ✅ COMPLETED 2025-10-05
- [x] [`tickets/DOC-04-document-metadata-tracking.md`](tickets/DOC-04-document-metadata-tracking.md) _(Small)_ ✅ COMPLETED 2025-10-05
- [x] [`tickets/DOC-01-document-crud-and-archive.md`](tickets/DOC-01-document-crud-and-archive.md) _(Medium - metadata only, no canvas)_ ✅ COMPLETED 2025-10-05
- [x] [`tickets/DOC-05-archive-hard-delete-policies.md`](tickets/DOC-05-archive-hard-delete-policies.md) _(Small)_ ✅ COMPLETED 2025-10-05
- [x] [`tickets/MEM-05-member-limit-guardrails.md`](tickets/MEM-05-member-limit-guardrails.md) _(Small)_ ✅ COMPLETED 2025-10-05
- [x] [`tickets/WS-03-member-settings-and-leave-flow.md`](tickets/WS-03-member-settings-and-leave-flow.md) _(Small)_ ✅ COMPLETED 2025-10-05

### Phase 2: Workspace Collaboration (Week 2-3) ✅ COMPLETE (2025-10-05)

**All 7 tickets completed successfully:**

- [x] [`tickets/MEM-01-role-management-and-ownership-transfer.md`](tickets/MEM-01-role-management-and-ownership-transfer.md) _(Medium)_ ✅ COMPLETED 2025-10-05
- [x] [`tickets/MEM-02-member-directory-and-removal.md`](tickets/MEM-02-member-directory-and-removal.md) _(Medium)_ ✅ COMPLETED 2025-10-05
- [x] [`tickets/MEM-03-invitation-link-lifecycle.md`](tickets/MEM-03-invitation-link-lifecycle.md) _(Medium)_ ✅ COMPLETED 2025-10-05
- [x] [`tickets/MEM-04-join-workspace-by-invite-link.md`](tickets/MEM-04-join-workspace-by-invite-link.md) _(Medium)_ ✅ COMPLETED 2025-10-05
- [x] [`tickets/INV-01-invitation-acceptance-flow.md`](tickets/INV-01-invitation-acceptance-flow.md) _(Small-Medium, combined)_ ✅ COMPLETED 2025-10-05
- [x] [`tickets/WS-04-workspace-archive-management.md`](tickets/WS-04-workspace-archive-management.md) _(Medium)_ ✅ COMPLETED 2025-10-05
- [x] [`tickets/SEC-01-rate-limiting-and-abuse-prevention.md`](tickets/SEC-01-rate-limiting-and-abuse-prevention.md) _(Small-Medium)_ ✅ COMPLETED 2025-10-05


**Bug fixing interlude**

We now want to fix our bugs and tech debt:

P0 (Critical - Blocking)

BUG-45: Invite Page UI States Not Rendering Correctly ⚠️
- Status: Not Started
- Impact: Users cannot join workspaces via invite links
- Scope: Consolidates BUG-38, BUG-39, BUG-41
- Issue: The invite page at /invite/[token] doesn't show:
  - "Join Workspace" button for valid invites
  - "Already a Member" message
  - "Link Expired" message for regenerated tokens
- Root cause: Server-side status determination or client rendering issue
- Tests failing: 4 tests in invite.spec.ts

P1 (High - Should Fix Soon)

BUG-46: Workspace Settings Invitation Section Not Rendering
- Status: Not Started
- Impact: Workspace owners cannot manage invitation links
- Scope: Consolidates BUG-36, BUG-37
- Issue: Settings page crashes or missing UI for:
  - Invitation link status ("Enabled/Disabled")
  - Invitation URL input field
  - Enable/disable toggle
  - Regenerate link button
- Root cause: Page crash when accessing invitation settings
- Tests failing: 2 tests in invitation-links.spec.ts

BUG-47: Realtime Document Updates Tests - Authentication Fixture Not Working
- Status: Backlog
- Impact: Cannot test realtime collaboration features
- Issue: authenticatedPage fixture shows login screen instead of authenticated state
- Tests failing: All 6 tests in realtime-document-updates.spec.ts
- Root cause: Authentication fixture setup broken

P2 (Medium)

BUG-43: Page Crashes During Sign-In in Member Limit API Test
- Status: Not Started
- Note: This is a TEST ISSUE, not an app bug
- Quick fix: Update test to use /login instead of /sign-in and use data-testid selectors

**Phase 2 Achievement Summary:**
- Complete member management system with role-based access control
- Invitation link lifecycle with secure token generation and validation
- Archive management with owner-only permanent deletion
- Rate limiting protection on critical endpoints
- Fixed BUG-05 (archive UI/API mismatch) as part of WS-04

### Phase 3: Documents & Folders (Week 3-4)

- [x] [`tickets/NAV-03A-document-creation-ui.md`](tickets/NAV-03A-document-creation-ui.md) _(Small - UI for creating/managing documents)_ ✅ COMPLETED 2025-10-05
- [x] [`tickets/TECH-05-folder-ancestry-validation.md`](tickets/resolved/TECH-05-folder-ancestry-validation.md) _(Medium)_ ✅ COMPLETED 2025-10-07
- [ ] [`tickets/DOC-02-folder-hierarchy-and-cycle-prevention.md`](tickets/DOC-02-folder-hierarchy-and-cycle-prevention.md) _(Large - COMPLEX)_
- [ ] [`tickets/DOC-03-document-move-operations.md`](tickets/DOC-03-document-move-operations.md) _(Medium)_
- [ ] [`tickets/NAV-03-workspace-browser.md`](tickets/NAV-03-workspace-browser.md) _(Medium - full browser with folder tree)_

### Phase 4: Document Views & Sharing (Week 4-5)

_Document views show file metadata/preview only - no canvas rendering_

- [ ] [`tickets/NAV-04A-member-document-view.md`](tickets/NAV-04A-member-document-view.md) _(Medium - simplified without canvas)_
- [ ] [`tickets/PERM-02-document-sharing-system.md`](tickets/PERM-02-document-sharing-system.md) _(Medium, combined)_
- [ ] [`tickets/NAV-04B-guest-document-view.md`](tickets/NAV-04B-guest-document-view.md) _(Medium - simplified without canvas)_
- [ ] [`tickets/PERM-03-guest-access-experience.md`](tickets/PERM-03-guest-access-experience.md) _(Medium)_

### Phase 5: Search & Polish (Week 5)

- [ ] [`tickets/NAV-06-document-search.md`](tickets/NAV-06-document-search.md) _(Medium)_

**Deferred to M2B or M3 (Canvas Integration Phase - 8 tickets):**

- [`tickets/TECH-02-tldraw-storage-and-snapshots.md`](tickets/TECH-02-tldraw-storage-and-snapshots.md) _(Large - R2 snapshots)_
- [`tickets/COLLAB-01A-basic-tldraw-integration.md`](tickets/COLLAB-01A-basic-tldraw-integration.md) _(Medium - tldraw component)_
- [`tickets/COLLAB-01B-multiplayer-sync-worker.md`](tickets/COLLAB-01B-multiplayer-sync-worker.md) _(Large - sync worker + WebSockets)_
- [`tickets/COLLAB-02-presence-indicators.md`](tickets/COLLAB-02-presence-indicators.md) _(Medium - canvas cursors/presence)_
- [`tickets/COLLAB-03-offline-resilience.md`](tickets/COLLAB-03-offline-resilience.md) _(Medium - offline canvas sync)_
- [`tickets/TECH-06-offline-status-detection.md`](tickets/TECH-06-offline-status-detection.md) _(Medium - supports canvas offline)_

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

## Milestone 2.5 – UI Foundation & shadcn Integration

**Goal:** Establish a comprehensive, reusable UI component system using shadcn/ui as the foundation for all future interface development. This milestone creates the architectural foundation that all subsequent UI work will build upon.

**Strategic Approach:** Conduct systematic inventory of existing UI elements, replace inline/custom components with standardized shadcn components, and establish development patterns and guidelines for consistent UI implementation across the application.

**Primary outcomes:**

- Complete component inventory identifying all UI integration opportunities
- `/src/components/ui/` folder containing foundational shadcn components (Button, Input, Form, Dialog, Alert, etc.)
- Comprehensive frontend development guide with design tokens, patterns, and standards
- Individual implementation tickets for each component integration
- Milestone blocks all new UI development until foundation is complete

**Prerequisites:** Milestone 2 tickets complete, existing Tailwind configuration stable.

**Estimated timeline:** 2-3 weeks with focus on foundation before any new UI work begins.

**Ticket checklist (UI Foundation):**

- [ ] [`tickets/backlog/DESIGN-06-shadcn-component-integration.md`](tickets/backlog/DESIGN-06-shadcn-component-integration.md) _(Extra Large - Foundation setup)_
- [ ] DESIGN-06-A: Button Component Integration _(Medium)_
- [ ] DESIGN-06-B: Input Component Integration _(Medium)_  
- [ ] DESIGN-06-C: Form Component Integration _(Large)_
- [ ] DESIGN-06-D: Dialog Component Integration _(Medium)_
- [ ] DESIGN-06-E: Alert Component Integration _(Medium)_
- [ ] Additional component tickets as identified in inventory

**Critical Dependencies:** 
- **BLOCKS Milestone 3** - Canvas integration must wait for UI foundation
- **BLOCKS all new UI work** - No new interface development until foundation complete

## Milestone 3 – Canvas Integration Foundation

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

- [ ] [`tickets/COLLAB-01A-basic-tldraw-integration.md`](tickets/COLLAB-01A-basic-tldraw-integration.md) _(Medium)_
- [ ] [`tickets/TECH-02-tldraw-storage-and-snapshots.md`](tickets/TECH-02-tldraw-storage-and-snapshots.md) _(Large)_
- [ ] [`tickets/COLLAB-01B-multiplayer-sync-worker.md`](tickets/COLLAB-01B-multiplayer-sync-worker.md) _(Large)_
- [ ] [`tickets/COLLAB-02-presence-indicators.md`](tickets/COLLAB-02-presence-indicators.md) _(Medium)_
- [ ] [`tickets/COLLAB-03-offline-resilience.md`](tickets/COLLAB-03-offline-resilience.md) _(Medium)_
- [ ] [`tickets/TECH-06-offline-status-detection.md`](tickets/TECH-06-offline-status-detection.md) _(Medium)_

### Ticket Guidance

- **COLLAB-01A** – Replace the placeholder canvas in `apps/simple-dotcom/simple-client/src/app/d/[documentId]/document-view-client.tsx` with the `<Tldraw />` component. Start with the minimal patterns in `apps/examples/src/examples/inline/InlineExample.tsx` and `apps/examples/src/misc/develop.tsx` to understand required providers. Use `persistenceKey={document.id}` so IndexedDB stores per-document state, and gate editability via the existing `canEdit` flag. Mirror the layout constraints from dotcom (`apps/dotcom/client/src/tla/components/TlaEditor/TlaEditor.tsx`) so the canvas stretches under the document header, and introduce a feature flag so the route can fall back to read-only while COLLAB-01B lands.
- **TECH-02** – Extend Supabase with `snapshot_key`, `last_snapshot_at`, and `snapshot_version` on `documents` (follow the migration style under `apps/simple-dotcom/supabase/migrations`). Reuse the R2 helpers from `apps/dotcom/sync-worker/src/r2.ts` and `snapshotUtils.ts` to implement `writeSnapshotWithRetry` inside the new worker. Share snapshot key formatting via a small module in `apps/simple-dotcom/simple-shared` so both worker and client agree on `documents/{workspace_id}/{document_id}/latest.json`. Update `apps/simple-dotcom/simple-client/src/app/d/[documentId]/page.tsx` to request the latest snapshot on load and fall back to an empty canvas when none exists.
- **COLLAB-01B** – Scaffold `apps/simple-dotcom/simple-worker/` using `apps/dotcom/sync-worker` as the reference but strip dotcom-specific routes. Minimum pieces: `wrangler.toml`, a Durable Object managing room state, WebSocket upgrade handling in `src/worker.ts`, and token validation that calls Supabase with a service-role key (copy the pattern from `apps/dotcom/sync-worker/src/utils/tla/getAuth.ts`). Add `apps/simple-dotcom/simple-client/src/app/api/sync/[documentId]/token/route.ts` to issue signed tokens after checking workspace permissions. On the client, swap the local persistence adapter for `useSync` from `@tldraw/sync` (see `apps/dotcom/client/src/tla/components/TlaEditor/TlaEditor.tsx`) and pipe the returned `store` into `<Tldraw />`.
- **COLLAB-02** – Surface live collaborators once sync is active. The tldraw editor will render cursors automatically if tokens include user metadata; extend the token payload in COLLAB-01B with `display_name` and colour hints. For the header participant list, subscribe to Supabase Realtime on the `presence` table using a client helper (build on the existing REST handler at `apps/simple-dotcom/simple-client/src/app/api/presence/[documentId]/route.ts`). Reference `packages/tldraw/src/components/DefaultCollaborators.tsx` for mapping collaborator state into avatars.
- **COLLAB-03** – Connect offline queues to user-facing banners. Leverage `useCollaborationStatus` / `OfflineIndicator` from `tldraw` (see `apps/dotcom/client/src/tla/components/TlaEditor/editor-components/TlaEditorTopPanel.tsx`) and expose clear copy when edits are queued. Ensure reconnect flow replays queued ops via the sync adapter—no bespoke queue needed. Extend Playwright coverage in `apps/simple-dotcom/simple-client/e2e` with a multi-tab offline scenario using `browserContext.setOffline(true)`.
- **TECH-06** – Implement a global connectivity service shared by dashboard and document routes. Create a hook under `apps/simple-dotcom/simple-client/src/hooks/useNetworkStatus.ts` that combines `window.navigator.onLine` events with a heartbeat fetch (add `/api/health` if needed). Provide context in `app/layout.tsx` and display a banner component that reuses the offline styles from `apps/dotcom/client/src/tla/components/TlaEditor/top.module.css` while avoiding workspace-name leaks for guests.

**Testing expectations:** After schema changes run `yarn workspace simple-client gen-types` then `yarn typecheck` at repo root. Multiplayer and offline scenarios require Playwright multi-browser coverage; reuse the patterns in `apps/simple-dotcom/simple-client/e2e` and the sync-focused examples under `apps/examples/src/examples/sync-*` for deterministic assertions.

## Milestone 4 – Launch Hardening & Readiness

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
- [x] [`tickets/TEST-05-worker-auth-fixture.md`](tickets/TEST-05-worker-auth-fixture.md)
- [x] [`tickets/TEST-06-auth-storage-state.md`](tickets/TEST-06-auth-storage-state.md)
- [ ] [`tickets/TEST-07-playwright-production-server.md`](tickets/TEST-07-playwright-production-server.md)
- [x] [`tickets/TEST-08-playwright-test-data-seeding.md`](tickets/TEST-08-playwright-test-data-seeding.md)
- [ ] [`tickets/TEST-09-playwright-artifact-tuning.md`](tickets/TEST-09-playwright-artifact-tuning.md)
- [ ] [`tickets/TEST-10-fast-global-reset.md`](tickets/TEST-10-fast-global-reset.md)

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
