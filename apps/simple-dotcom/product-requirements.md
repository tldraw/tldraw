# Simple tldraw App — Product Requirements

## Overview
- Deliver a collaborative whiteboard experience built on the tldraw infinite canvas with Supabase-backed persistence and real-time collaboration.
- Support both private and shared workspaces so individuals can organize personal boards and collaborate with teams under a unified interface.
- Launch an MVP that prioritizes the P0 feature set defined in product and engineering notes; defer advanced capabilities to the post-MVP backlog captured below.

## User Roles & Access Levels
- **Workspace Owner**: Creates shared workspaces, holds administrative control (member management, settings, deletion) and owns the private workspace generated at signup.
- **Workspace Member**: Invited collaborator with full document and folder capabilities inside the shared workspace but limited administrative permissions.
- **Guest**: Unauthenticated or non-member user accessing a public document via shared link; capabilities depend on the document's sharing state (read-only vs editable).

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
- Document export, advanced profiles, notifications, audit logs, additional document types, granular permissions, document versioning UI, advanced workspace settings, templates, bulk operations, and OAuth are explicitly post-MVP.
- Pricing, Workers resource limits, and Better Auth contingency plans require architectural flexibility to swap providers without major refactors.
- Team expectation: 2–3 engineers (frontend, backend/infrastructure, full-stack) working in parallel on app, API, and sync components.
- No predefined product UI exists beyond the tldraw canvas; engineering should collaborate with design for first-pass UI, then hand off for refinement.

## Dependencies & Risks
- **Authentication Provider Risk**: Abstract auth layer to allow migration to Supabase Auth or custom JWT if Better Auth falls short.
- **Cloudflare Worker Limits**: Observe CPU (50ms/request) and memory (128MB) constraints; use Durable Objects for long-lived WebSocket sessions.
- **Supabase Scaling**: Monitor real-time channel usage and database performance within defined sanity limits.
- **Reuse Opportunities**: Leverage patterns from existing dotcom app, templates, and sync-worker to accelerate development and ensure consistency.

## Post-MVP Backlog (For Future Planning)
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

