# Simple tldraw Specification

## Product Overview
- Collaborative whiteboard application built on the tldraw infinite canvas with Supabase-backed persistence and real-time collaboration.
- Unified experience for private and shared workspaces so individuals can organize personal boards and collaborate with teams in one interface.
- MVP focuses on the P0 feature set defined below; advanced capabilities move to the post-MVP backlog for future iterations.

## User Roles & Access Levels
- **Workspace Owner**: Creates shared workspaces, manages members and settings, and controls the private workspace provisioned at signup.
- **Workspace Member**: Invited collaborator with full document and folder capabilities inside shared workspaces but limited administrative permissions.
- **Guest**: Unauthenticated or non-member user accessing a shared document via link; capabilities depend on the document's sharing mode (read-only vs editable).

## MVP Scope
### Goals
- Authentication and account management.
- Private and shared workspaces with membership controls.
- Document and folder organization.
- Real-time collaboration across canvases.
- Sharing and permissions enforcement.
- Core UI and UX to support the above experiences.

### Non-Goals & Future Enhancements
- All features captured in the Post-MVP backlog table later in this document are explicitly out of scope for the MVP.
- Advanced functionality such as document templates, expanded permissions, exports, and rich profile customization are deferred.

### Constraints & Operational Limits
- Target ceilings: ~100 workspaces per user, ~100 members per workspace, ~1000 documents per workspace, 10 levels of folder depth, and ~10MB document payloads.
- Network resilience must handle offline edits with graceful recovery.
- Team expectation: 2–3 engineers (frontend, backend/infrastructure, full-stack) working in parallel on app, API, and sync layers.

## MVP Requirements

### Authentication & Account Management
| ID | Requirement | Engineering Notes | Design Notes |
| --- | --- | --- | --- |
| AUTH-01 | Provide email/password signup, login, logout, and session management using Better Auth. | Integrate Better Auth endpoints under `/api/auth/*`; enforce secure session handling and refresh. | Design streamlined auth screens with clear primary actions and links between login, signup, and password reset. |
| AUTH-02 | Automatically create a non-deletable, non-renamable private workspace for each new user. | Trigger private workspace provisioning immediately after successful signup; store ownership in Supabase. | Surface private workspace in dashboard alongside shared workspaces with explanatory copy. |
| AUTH-03 | Offer password recovery via `/forgot-password` and `/reset-password` routes. | Implement email token-based reset flow with Better Auth; ensure tokens validate before password change. | Provide accessible forms with validation messaging and clear success/error states. |
| AUTH-04 | Support basic user profiles capturing name, email, and display name. | Store profile fields in Supabase `users` table; expose read/write API under `/profile`. | Create simple profile edit screen prioritizing form clarity; no advanced customization in MVP. |

### Workspace Foundation & Management
| ID | Requirement | Engineering Notes | Design Notes |
| --- | --- | --- | --- |
| WS-01 | Enable creation, renaming, and soft deletion of shared workspaces. | Persist workspaces in Supabase with `is_deleted` flag; expose CRUD via `/api/workspaces`. | Provide create workspace affordance on dashboard; use confirmation for soft delete with recovery guidance. |
| WS-02 | Restrict workspace deletion to owners and enforce transfer-or-delete rules before an owner exits. | Validate ownership before delete; block `leave` action unless ownership transferred or workspace deleted. | Communicate ownership constraints in settings UI; prompt owners when attempting to leave. |
| WS-03 | Allow members to view workspace settings in read-only mode and leave shared workspaces at will. | Implement access control in settings route; ensure `leave` operation updates membership records. | Present settings view with disabled controls for members and a prominent "Leave workspace" action. |
| WS-04 | Surface workspace archive for managing archived documents (restore or permanent delete). | Implement archive route backed by Supabase queries filtering `is_archived`; enforce hard delete permissions. | Include archive entry in workspace navigation with clear state indicators for archived items. |
| WS-05 | Honor sanity limits of ~100 workspaces per user for planning purposes. | Monitor counts and prepare guardrails or warnings at Supabase layer; no hard block required in MVP. | Display friendly messaging if user approaches workspace limit to set expectations. |

### Workspace Membership & Invitations
| ID | Requirement | Engineering Notes | Design Notes |
| --- | --- | --- | --- |
| MEM-01 | Maintain owner/member roles with ability to transfer ownership. | Store roles in `workspace_members` table; expose transfer endpoint validating target member. | Provide ownership transfer control in settings with confirmation and clarity on role changes. |
| MEM-02 | List all workspace members and allow owners to remove members. | Implement `/api/workspaces/[id]/members` list and removal endpoints with RLS safeguards. | Design member list with role badges and contextual actions separated by permission level. |
| MEM-03 | Generate, enable/disable, and regenerate workspace invitation links. | Persist invitation link state in `invitation_links` table; regenerating should invalidate prior tokens. | Display invitation link status with copy controls; differentiate enabled vs disabled states visually. |
| MEM-04 | Support join-by-link flow at `/invite/[token]` with immediate membership on success. | Validate token, enforce link enabled state, and auto-create membership after auth; handle expired/disabled cases. | Provide loading and success feedback when joining; show descriptive error page when link invalid. |
| MEM-05 | Enforce limit of ~100 members per workspace for stability. | Apply sanity checks in APIs and surface warnings before insertion when nearing limit. | Surface limit messaging in member management UI to set expectations. |

### Documents & Folders
| ID | Requirement | Engineering Notes | Design Notes |
| --- | --- | --- | --- |
| DOC-01 | Create, rename, duplicate, delete, archive, and restore documents within workspaces. | Implement document CRUD in `/api/workspaces/[id]/documents`; maintain `is_archived` and soft-delete flags. | Provide contextual controls in document lists and document view; confirm destructive actions. |
| DOC-02 | Support folder creation, renaming, deletion, and nesting with cycle prevention up to 10 levels deep. | Use adjacency list schema with parent validation to block cycles and enforce depth limit. | Visualize folder hierarchy with breadcrumbs and tree interactions; communicate max depth if hit. |
| DOC-03 | Allow moving documents between folders in a workspace and between workspaces when initiated by the creator. | Validate creator ownership before cross-workspace moves; update references atomically. | Provide move dialogs with workspace/folder selectors and restrictions messaging for non-creators. |
| DOC-04 | Track document metadata (creator, creation timestamp, last modified). | Persist metadata fields in Supabase; ensure updates refresh `updated_at`; expose via `/api/documents/[id]`. | Display metadata in document detail UI to reinforce ownership and recency. |
| DOC-05 | Enforce document archive per workspace and allow hard delete from archive. | Provide archive collection queries and permanent delete endpoint guarded by confirmation. | Clearly separate archive from active lists; highlight irreversible nature of permanent delete. |
| DOC-06 | Support up to ~1000 documents per workspace and 10MB per document for planning. | Implement sanity checks and monitoring on document counts and payload sizes; consider warnings. | Communicate limits in UI when near capacity to manage expectations. |

### Real-Time Collaboration & Presence
| ID | Requirement | Engineering Notes | Design Notes |
| --- | --- | --- | --- |
| COLLAB-01 | Deliver real-time multiplayer editing on tldraw canvases. | Use tldraw sync worker on Cloudflare Durable Objects with WebSockets; ensure reliable session handling. | Incorporate real-time indicators (e.g., cursors, selection highlights) using existing tldraw patterns. |
| COLLAB-02 | Show presence for users viewing or editing a document. | Integrate Supabase Realtime or dedicated presence channel; update UI based on active sessions. | Display avatars/initials and cursor states; ensure unobtrusive presence styling. |
| COLLAB-03 | Preserve offline edits locally and sync when connection restores for canvas interactions. | Leverage tldraw's sync queue; surface connectivity state in app chrome to inform users. | Provide subtle offline banners/toasts indicating state and resync progress. |

### Sharing & Permissions
| ID | Requirement | Engineering Notes | Design Notes |
| --- | --- | --- | --- |
| PERM-01 | Limit workspace access to owners/members; block non-members. | Enforce Supabase RLS policies across workspace-scoped data and API validation. | Ensure navigation reflects access; gracefully handle forbidden states with messaging. |
| PERM-02 | Support document sharing modes: private, public read-only, public editable. | Implement `/api/documents/[id]/share` to manage permissions; respect settings in canvas and APIs. | Provide sharing modal with clear mode descriptions and warnings for public editable. |
| PERM-03 | Allow guest access based on sharing mode while preventing access to workspace chrome and management controls. | Render guest experience without workspace data; enforce 403 for private docs. | Create lightweight public view with focused canvas and absence of workspace navigation. |
| PERM-04 | Restrict sharing settings changes to workspace members. | Validate membership before mutating sharing mode; audit permission transitions. | Hide or disable sharing controls for guests; indicate permission boundaries visually. |

### Navigation, Discovery & UI Structure
| ID | Requirement | Engineering Notes | Design Notes |
| --- | --- | --- | --- |
| NAV-01 | Provide marketing landing page at `/` with product overview and auth CTAs. | Render static marketing content; ensure unauthenticated routing. | Design hero section with value proposition and routes to login/signup. |
| NAV-02 | Implement global dashboard at `/dashboard` listing all workspaces, documents, folders, and recents simultaneously. | Aggregate data queries across workspaces; optimize using indexed queries. | Design sidebar-first layout showing all workspaces without workspace switcher. |
| NAV-03 | Provide workspace-level browsing at `/workspace/[id]` with folder tree, archive access, and creation controls. | Fetch workspace-scoped data efficiently; reuse folder adjacency queries. | Deliver two-pane layout with breadcrumb navigation and consistent actions. |
| NAV-04 | Offer document view at `/d/[id]` tailored to role (member vs guest). | Gate feature flags based on role; ensure proper embedding of tldraw component. | Present full editor for members and trimmed canvas-only experience for guests. |
| NAV-05 | Include member management, settings, archive, folder, profile, settings, and invite routes as specified. | Implement Next.js routing structure aligning with sitemap; secure each route by role. | Ensure route-specific UIs align with expected capabilities and incorporate state feedback. |
| NAV-06 | Provide simple search across a user's workspaces by document name. | Implement search endpoint leveraging indexed fields; return results with workspace context. | Place search input prominently (e.g., dashboard header) with actionable result list. |

### Invitations & Onboarding
| ID | Requirement | Engineering Notes | Design Notes |
| --- | --- | --- | --- |
| INV-01 | Require authentication before accepting invitation links, redirecting to login when needed. | Preserve invite token through auth flow; resume join process post-login. | Provide clear messaging during redirect and success state after login. |
| INV-02 | Show errors when invitation link disabled, regenerated, or user already a member. | Validate token state; craft error responses for UI. | Design informative error views guiding users to request a new link. |

### Performance, Limits & Reliability
| ID | Requirement | Engineering Notes | Design Notes |
| --- | --- | --- | --- |
| PERF-01 | Aim for document load <2s, sync latency <200ms, workspace queries <1s, search results <500ms. | Instrument performance metrics; optimize queries and WebSocket handling accordingly. | Display loading states that respect targets and reassure users when operations are in progress. |
| PERF-02 | Separate real-time channels for canvas sync vs application data to avoid contention. | Configure distinct Supabase Realtime channels alongside tldraw sync worker. | Ensure UI gracefully reflects updates from both channels without jitter. |
| PERF-03 | Implement short-lived caching (5–10s) for permission checks with immediate invalidation on changes. | Use edge caching or in-memory caches invalidated by Supabase Realtime events. | Provide responsive UI when permissions update (e.g., toast notifying access changes). |

### Technical Infrastructure & Data
| ID | Requirement | Engineering Notes | Design Notes |
| --- | --- | --- | --- |
| TECH-01 | Use Supabase PostgreSQL for application data with RLS enforcing access control. | Define schema covering users, workspaces, workspace_members, folders, documents, invitation_links. | Align UI data requirements with schema fields; ensure forms capture required attributes. |
| TECH-02 | Store tldraw document data in Cloudflare R2; persist snapshots for backups. | Implement sync server writing snapshots to R2; manage lifecycle policies. | Indicate autosave status to reassure users about persistence. |
| TECH-03 | Deploy Next.js + Tailwind + shadcn (Radix) for frontend; Vercel for app hosting; Cloudflare Workers for sync. | Follow existing dotcom/dotcom-sync architecture for reuse; configure environments. | Leverage shared design system tokens from Tailwind/shadcn for consistent visuals. |
| TECH-04 | Publish RESTful APIs under documented routes (workspaces, documents, folders, members, invite, share, presence). | Implement versioned API handlers; ensure auth guards and response parity with requirements. | Document interactions in UI copy or tooltips where necessary to explain capabilities. |
| TECH-05 | Enforce folder ancestry validation when creating/moving folders to prevent cycles. | Traverse parent chain before commit; reject invalid operations gracefully. | Surface descriptive error messaging when move is blocked. |
| TECH-06 | Support offline notification when the app UI loses connectivity. | Hook into network status within Next.js; coordinate with tldraw offline queue. | Provide unobtrusive offline banner that matches product tone. |

### Testing & Quality
| ID | Requirement | Engineering Notes | Design Notes |
| --- | --- | --- | --- |
| TEST-01 | Use Playwright for end-to-end coverage of core flows (auth, workspace management, documents, folders, sync, permissions). | Set up dedicated Supabase test project and Cloudflare Worker; seed/cleanup test data across suites. | Provide test IDs in critical UI elements to ease selectors; maintain consistent layout for automation. |
| TEST-02 | Simulate multiplayer scenarios with multiple browser contexts in tests. | Implement Playwright patterns mirroring dotcom app; ensure presence/sync events are observable. | Ensure UI surfaces presence cues reliable enough to assert in automated tests. |
| TEST-03 | Validate permission enforcement and guest access paths through automated scenarios. | Cover 403 flows, document sharing toggles, and guest editing restrictions. | Design error and restricted views with distinct identifiers for test targeting. |

## Supporting Notes & Constraints
- Post-MVP capabilities (exports, advanced profiles, notifications, audit logs, advanced document types, granular permissions, templates, bulk operations, OAuth) remain out of scope until future phases.
- Pricing, Cloudflare Workers resource limits, and Better Auth contingency plans require architectural flexibility to swap providers without major refactors.
- Collaboration with design is necessary for first-pass UI beyond the tldraw canvas before final polish.

## Dependencies & Risks
- Abstract authentication integration so migration to Supabase Auth or custom JWT remains viable if Better Auth fails to meet needs.
- Monitor Cloudflare Worker CPU (50ms/request) and memory (128MB) constraints; Durable Objects manage long-lived WebSocket sessions.
- Watch Supabase Realtime channel usage and database performance within defined sanity limits.
- Heavy reliance on Better Auth integration complexity, Cloudflare Worker scalability, Supabase rate limits, R2 storage costs, and folder hierarchy performance are primary technical risks.

## Post-MVP Backlog (Future Planning)
| ID | Future Capability | Engineering Notes | Design Notes |
| --- | --- | --- | --- |
| PMVP-01 | Advanced user profiles (avatars, custom display settings, enhanced pages). | Extend profile schema and storage (e.g., asset uploads). | Introduce richer profile layouts and avatar treatments. |
| PMVP-02 | Notifications system (email and in-app). | Implement notification service and subscription preferences. | Design notification center and toast patterns. |
| PMVP-03 | Audit logs (document history, workspace activity). | Capture events and expose queryable logs. | Create timeline UI for owners/admins. |
| PMVP-04 | Advanced document types (presentations, mindmaps, text docs). | Expand document model and editor integrations. | Craft UI variations per document type. |
| PMVP-05 | Advanced permissions with granular roles per document type. | Introduce role matrix and policy management UI. | Design role assignment flows and permission indicators. |
| PMVP-06 | Document versioning UI for R2 snapshots. | Build snapshot browsing and restore mechanics. | Visual timeline/modal for version selection. |
| PMVP-07 | Advanced workspace settings (descriptions, default permissions, custom roles). | Extend workspace config schema. | Expand settings UI with structured sections. |
| PMVP-08 | Document templates. | Provide template selection/create flows. | Design template gallery and preview interactions. |
| PMVP-09 | Bulk operations (multi-select, batch move/delete). | Implement batch APIs and selection states. | Introduce list/table selection UI with bulk action toolbar. |
| PMVP-10 | Document export (PDF, PNG, SVG). | Integrate export pipeline with tldraw capabilities. | Add export modal with format options. |
| PMVP-11 | OAuth authentication providers. | Hook additional providers into auth layer while preserving existing flows. | Extend auth screens with provider buttons and supporting copy. |

## Technical Architecture & Implementation

### System Architecture Overview
- Next.js client hosted on Vercel powers the marketing site and authenticated application experience.
- Supabase PostgreSQL with Realtime delivers persistence, RLS-backed access control, and change streams.
- Cloudflare Durable Objects worker manages tldraw synchronization over WebSockets.
- Cloudflare R2 stores document snapshots and large binary assets.

### Monorepo Structure
- `apps/simple-client`: Next.js application implementing marketing, dashboard, workspace, and document routes.
- `workers/simple-worker`: Cloudflare worker responsible for sync, permission verification, and snapshot handling.
- `packages/simple-shared`: Shared types, schema definitions, and utilities reused across client and worker.

### Data Flow & Technology Rationale
- Client → API → Database for CRUD operations through Next.js API routes backed by Supabase queries.
- Client → Sync Worker → R2 for high-frequency canvas updates, with snapshots written to R2 and metadata persisted in Supabase.
- Supabase Realtime delivers workspace, document, folder, and presence updates to the client and worker layers.
- Better Auth selected for composable email/password flows; Cloudflare Workers provide low-latency sync; Supabase offers RLS-first multi-tenant data model; R2 delivers cost-effective object storage.

### Data Model
- Core tables: `users`, `workspaces`, `workspace_members`, `invitation_links`, `folders`, `documents`, `document_access_log`, and `presence`.
- Relationships enforce ownership, membership roles, and folder hierarchies via adjacency list patterns with max-depth validation and cycle prevention.
- Index strategy covers primary keys, foreign keys, and performance/search indexes (including `pg_trgm`) to support global search and filters.

### Authentication & Authorization
- Better Auth integration handles session management, token issuance, email/password flows, and API route validation.
- Authorization layers operate across frontend gating, server-side validation, Supabase RLS policies, and worker-level checks before enabling sync actions.
- Permission model differentiates owners, members, and guests at workspace and document scopes, including guest read/edit rules as defined in the requirements.

### API Surface
- Authentication: `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session`.
- Workspaces: `GET|POST /api/workspaces`, `GET|PATCH|DELETE /api/workspaces/:workspaceId`, `POST /api/workspaces/:workspaceId/leave`, `POST /api/workspaces/:workspaceId/transfer-ownership`.
- Invitations: `GET /api/workspaces/:workspaceId/invite`, `POST /api/workspaces/:workspaceId/invite/regenerate`, `PATCH /api/workspaces/:workspaceId/invite`, `POST /api/invite/:token/join`.
- Documents: `GET|POST /api/workspaces/:workspaceId/documents`, `GET|PATCH|DELETE /api/documents/:documentId`, `POST /api/documents/:documentId/duplicate`, `PATCH /api/documents/:documentId/share`, `POST /api/documents/:documentId/access`.
- Folders: `GET|POST /api/workspaces/:workspaceId/folders`, `PATCH|DELETE /api/folders/:folderId`.
- Members: `GET /api/workspaces/:workspaceId/members`, `DELETE /api/workspaces/:workspaceId/members/:userId`.
- Search: `GET /api/search`.
- Presence: `POST /api/presence/:documentId`, `GET /api/presence/:documentId`.
- Error handling aligns with consistent status codes and structured payloads across endpoints.

### Sync Worker Architecture
- Durable Object instances provisioned per document manage WebSocket connections, state replication, and write throttling.
- Worker entry point routes HTTP and WebSocket requests, performs session validation, handles CORS, and upgrades connections.
- Permission validation occurs before joining sync rooms, differentiating read vs write access for members and guests.
- R2 snapshot strategy defines snapshot cadence, naming conventions, metadata management, and backup retention aligned with storage costs.
- Supabase integration within the worker uses service-role keys to fetch permissions and update metadata.

### Frontend Architecture
- Route structure covers public marketing (`/`, `/login`, `/signup`, etc.) and authenticated routes (`/dashboard`, `/workspace/*`, `/d/*`) guarded with middleware.
- Component layers include shared layouts, workspace navigation components, document canvases, folder trees, and search surfaces.
- State management combines React Context providers for auth/session, React Query (or equivalent) for server state, and localized state for UI controls.
- Real-time updates leverage Supabase Realtime subscriptions with clear channel strategy, optimistic updates, and conflict resolution patterns.
- tldraw integration includes editor initialization, permission-aware tool configuration, and custom UI components around the canvas.

### Real-Time Collaboration
- Canvas sync connects clients to the Cloudflare worker via WebSockets for high-frequency updates and optimistic rendering.
- Presence system uses Supabase Realtime to track active viewers/editors, broadcast cursor positions, and show active user indicators.
- Application data sync keeps workspace lists, folder trees, and permission states consistent through channel separation (canvas, app data, presence).

### Performance & Optimization
- Database access optimized via efficient joins, batching, pagination, and index usage on hot paths (dashboard, search, membership lists).
- Caching strategy specifies short-lived caches with explicit invalidation triggers driven by Realtime events.
- Channel optimization covers subscribe/unsubscribe patterns, connection cleanup, and pooling to respect Worker limits.
- Frontend performance relies on code splitting, lazy loading, virtualized lists, and debounced inputs, while R2 snapshot compression manages storage efficiency.

### Security Considerations
- Authentication security enforces secure cookies, CSRF protections, and password policies defined by Better Auth.
- Authorization defense in depth spans client gating, API checks, Supabase RLS, and worker-side verification to prevent privilege escalation.
- Input validation uses shared schema validation (e.g., Zod) to prevent injection and XSS, with consistent error messaging.
- Rate limiting covers per-user and per-endpoint limits plus invite link protections to deter abuse.
- Data privacy ensures email visibility restrictions, guest data handling, and clear soft-delete semantics.

### Testing Strategy
- Playwright-based end-to-end suite spans authentication, workspace management, document/folder operations, search, sync, and permissions.
- Multiplayer testing simulates concurrent sessions to verify presence, conflict resolution, and offline-to-online transitions.
- Performance benchmarks validate load time (<2s), sync latency (<200ms), and search responsiveness (<500ms) against instrumentation.
- Test data seeding uses dedicated Supabase projects and Worker environments with scripted fixtures and cleanup routines.

### Deployment & Environments
- Environment tiers (development, staging, production) require consistent configuration management and secrets handling.
- Next.js app deploys via Vercel with proper build settings, environment variables, and custom domains.
- Cloudflare worker deploys through Wrangler with Durable Object bindings, R2 configuration, and secret rotation.
- Supabase setup includes migrations, RLS enablement, Realtime configuration, and extension installation (e.g., `pg_trgm`).
- CI/CD pipeline runs builds, automated tests, and orchestrates deployments with rollback procedures.

### Implementation Phases
1. **Phase 1: Foundation** — Monorepo setup, authentication, and base schema.
2. **Phase 2: Workspace & Document Core** — Workspace/document CRUD and initial tldraw wiring.
3. **Phase 3: Organization & Folders** — Folder system, hierarchy validation, drag-and-drop.
4. **Phase 4: Real-Time Sync** — Sync worker integration, presence system, real-time updates.
5. **Phase 5: Permissions & Sharing** — Sharing flows, guest access, archive/restore.
6. **Phase 6: Search & Polish** — Search implementation, error handling, performance tuning.
7. **Phase 7: Testing & Launch** — E2E coverage, performance testing, production deployment.

### Edge Cases & Scenario Coverage
- Invitation flows: unauthenticated access, disabled/regenerated links, already-a-member handling.
- Document sharing: switching privacy while guests editing, workspace deletion during guest sessions, moves during active edits.
- Workspace management: owner exit restrictions, last member leaving, ownership transfer permutations.
- Folder operations: cycle prevention, maximum depth enforcement, moving/deleting large hierarchies.
- Offline and recovery: network interruptions, worker downtime, Supabase outages, and associated recovery strategies.

### Open Questions & Outstanding Decisions
- Folder deletion behavior (cascade vs prevent) and document duplication scope.
- Workspace deletion retention, rate limiting specifics, and placement for recent documents UI.

### Success Metrics
- MVP launch criteria cover functional completeness, performance targets, security posture, and documentation readiness.
- Post-launch metrics track usage (DAU, documents created), performance (latencies, error rates), and business outcomes (retention, conversion).

### Reference Implementations
- Reuse patterns from `apps/dotcom` for auth flows, sync worker architecture, Supabase integration, and error handling.
- Reference template projects for baseline tldraw setup and canvas initialization.
- Key files from existing repositories provide migration examples and architectural guidance.

### Appendix
- Glossary of key terms for collaboration, workspaces, and permissions.
- Workspace permissions matrix aligning owner/member/guest abilities.
- Route map covering marketing, dashboard, workspace, document, archive, member, settings, profile, invite, search, and auth flows.
- Additional resources linking to external documentation (Better Auth, Supabase, Cloudflare Workers, tldraw).
