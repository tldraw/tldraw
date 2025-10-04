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
- [ ] [`tickets/TEST-01-playwright-e2e-suite.md`](tickets/TEST-01-playwright-e2e-suite.md)
- [x] [`tickets/AUTH-03-password-recovery-flow.md`](tickets/AUTH-03-password-recovery-flow.md)
- [ ] [`tickets/AUTH-04-basic-user-profiles.md`](tickets/AUTH-04-basic-user-profiles.md)
- [ ] [`tickets/AUTH-05-private-workspace-validation-rules.md`](tickets/AUTH-05-private-workspace-validation-rules.md)
- [ ] [`tickets/WS-01-shared-workspace-crud.md`](tickets/WS-01-shared-workspace-crud.md)
- [ ] [`tickets/WS-02-owner-deletion-constraints.md`](tickets/WS-02-owner-deletion-constraints.md)
- [ ] [`tickets/PERM-01-workspace-access-control.md`](tickets/PERM-01-workspace-access-control.md)
- [ ] [`tickets/NAV-02-global-dashboard.md`](tickets/NAV-02-global-dashboard.md)
- [ ] [`tickets/NAV-07-recent-documents-tracking-and-display.md`](tickets/NAV-07-recent-documents-tracking-and-display.md)
- [ ] [`tickets/NAV-05-route-structure-and-guards.md`](tickets/NAV-05-route-structure-and-guards.md)

## Milestone 2 – Collaboration & Organization

**Goal:** Enable teams to collaborate inside shared workspaces with full document and folder management, real-time editing, and shareability within the authenticated experience.

**Primary outcomes:**
- Workspace settings, archives, and membership management (including invite lifecycle).
- Document/folder CRUD with hierarchy enforcement and real-time tldraw collaboration.
- Role-aware navigation, presence, sharing, guest-ready document views, and search across workspaces.

**Ticket checklist:**
- [ ] [`tickets/WS-03-member-settings-and-leave-flow.md`](tickets/WS-03-member-settings-and-leave-flow.md)
- [ ] [`tickets/WS-04-workspace-archive-management.md`](tickets/WS-04-workspace-archive-management.md)
- [ ] [`tickets/MEM-01-role-management-and-ownership-transfer.md`](tickets/MEM-01-role-management-and-ownership-transfer.md)
- [ ] [`tickets/MEM-02-member-directory-and-removal.md`](tickets/MEM-02-member-directory-and-removal.md)
- [ ] [`tickets/MEM-03-invitation-link-lifecycle.md`](tickets/MEM-03-invitation-link-lifecycle.md)
- [ ] [`tickets/MEM-04-join-workspace-by-invite-link.md`](tickets/MEM-04-join-workspace-by-invite-link.md)
- [ ] [`tickets/MEM-05-member-limit-guardrails.md`](tickets/MEM-05-member-limit-guardrails.md)
- [ ] [`tickets/INV-01-auth-gated-invite-acceptance.md`](tickets/INV-01-auth-gated-invite-acceptance.md)
- [ ] [`tickets/INV-02-invite-error-handling.md`](tickets/INV-02-invite-error-handling.md)
- [ ] [`tickets/SEC-01-rate-limiting-and-abuse-prevention.md`](tickets/SEC-01-rate-limiting-and-abuse-prevention.md)
- [ ] [`tickets/DOC-01-document-crud-and-archive.md`](tickets/DOC-01-document-crud-and-archive.md)
- [ ] [`tickets/DOC-02-folder-hierarchy-and-cycle-prevention.md`](tickets/DOC-02-folder-hierarchy-and-cycle-prevention.md)
- [ ] [`tickets/DOC-03-document-move-operations.md`](tickets/DOC-03-document-move-operations.md)
- [ ] [`tickets/DOC-04-document-metadata-tracking.md`](tickets/DOC-04-document-metadata-tracking.md)
- [ ] [`tickets/DOC-05-archive-hard-delete-policies.md`](tickets/DOC-05-archive-hard-delete-policies.md)
- [ ] [`tickets/COLLAB-01-real-time-editing.md`](tickets/COLLAB-01-real-time-editing.md)
- [ ] [`tickets/COLLAB-02-presence-indicators.md`](tickets/COLLAB-02-presence-indicators.md)
- [ ] [`tickets/COLLAB-03-offline-resilience.md`](tickets/COLLAB-03-offline-resilience.md)
- [ ] [`tickets/PERM-02-document-sharing-modes.md`](tickets/PERM-02-document-sharing-modes.md)
- [ ] [`tickets/PERM-03-guest-access-experience.md`](tickets/PERM-03-guest-access-experience.md)
- [ ] [`tickets/PERM-04-sharing-permission-enforcement.md`](tickets/PERM-04-sharing-permission-enforcement.md)
- [ ] [`tickets/NAV-03-workspace-browser.md`](tickets/NAV-03-workspace-browser.md)
- [ ] [`tickets/NAV-04-document-view-experience.md`](tickets/NAV-04-document-view-experience.md)
- [ ] [`tickets/NAV-06-document-search.md`](tickets/NAV-06-document-search.md)
- [ ] [`tickets/TECH-02-tldraw-storage-and-snapshots.md`](tickets/TECH-02-tldraw-storage-and-snapshots.md)
- [ ] [`tickets/TECH-05-folder-ancestry-validation.md`](tickets/TECH-05-folder-ancestry-validation.md)
- [ ] [`tickets/TECH-06-offline-status-detection.md`](tickets/TECH-06-offline-status-detection.md)

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
