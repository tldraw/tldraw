# Engineering Meeting Notes

## Scope & Prioritization

### MVP Definition

Q: What features are P0 for launch versus features that can be added later?

A: P0 features for MVP launch are:
- User authentication (signup, login, logout, session management with email/password only)
- User profiles (basic: name, email, display name)
- Private workspace (automatically created, cannot be deleted or renamed)
- Shared workspaces (create, rename, soft delete)
- Workspace settings (edit name, manage members, manage invitation links)
- Workspace invitations (generate invite link, enable/disable link, regenerate link, join via link)
- Workspace membership (view members, basic role: member vs owner, transfer ownership, leave workspace)
- Documents (create, rename, archive, restore, hard delete)
- Folders (create, rename, delete, nest with cycle prevention)
- Document organization (move documents between folders, move documents between workspaces for document creators)
- Real-time multiplayer sync (concurrent editing via tldraw sync worker)
- Presence (show which users are viewing/editing which documents)
- Document permissions (public vs private documents)
- Guest access (view/edit public documents without workspace membership)
- Document search (simple search by document name across user's workspaces)
- Dashboard/sidebar (workspace list, document list, folder tree, recent documents)

Post-MVP features:
- Advanced user profiles (avatars, custom display settings, enhanced profile pages)
- Notifications system (email, in-app notifications)
- Audit logs (document edit history, workspace activity logs)
- Advanced document types (presentations, mindmaps, text documents)
- Advanced permissions (different permissions per document type, granular role permissions)
- Document versioning UI (viewing/restoring specific snapshots from R2)
- Advanced workspace settings (workspace description, default permissions, custom member roles)
- Document templates
- Bulk operations (multi-select, batch move/delete)
- Document export features (PDF, PNG, SVG)
- OAuth authentication providers

Q: Is folder nesting required for MVP, or can we start with flat document lists?

A: Folders are required for MVP.

Q: Do we need the archive feature at launch, or can documents just be deleted initially?

A: Archive is required for MVP.

### Feature Complexity

Q: How deep can folder nesting go, and are there any limits?

A: There are no hard limits on folder nesting depth. We should implement a sanity check of 10 folders deep.

Q: What's the maximum number of workspaces and documents per user we should support?

A: There are no hard limits on workspaces or documents. We should implement sanity checks of 100 workspaces and 1000 documents per user.

Q: Are there any file size limits or performance considerations for tldraw documents?

A: The file size limit is 10MB per document.

## Technical Implementation Details

### Data Model

Q: What's the Supabase schema (users, workspaces, workspace_members, documents, folders, etc.)?

A: The engineering team should design the complete schema. At minimum, the schema must include:

**Users table:**
- id, email, name, display_name, created_at, updated_at

**Workspaces table:**
- id, name, owner_id, is_deleted, created_at, updated_at

**Workspace_members table:**
- id, workspace_id, user_id, role (owner/member), joined_at

**Folders table:**
- id, workspace_id, parent_id, name, created_at, updated_at

**Documents table:**
- id, workspace_id, folder_id, name, creator_id, is_archived, is_private, created_at, updated_at

**Invitation_links table:**
- id, workspace_id, token, is_enabled, created_at, regenerated_at

See product.md and the Implementation Details section below for additional schema guidance.

Q: How do we handle document versioning and history?

A: The sync server should persist snapshots of the document over time to an R2 bucket for backup purposes. The UI to view and restore specific snapshots is a post-MVP feature. For MVP, we track document creator, creation timestamp, and last modified timestamp.

Q: Where is tldraw document data stored—in Supabase or separate storage?

A: Documents are stored in R2. Application data is stored in Supabase.

Q: How do we store folder hierarchy (adjacency list, nested sets, materialized path)?

A: We should use an adjacency list model with parent_id references for simplicity and flexibility. The schema should include:

**Folders table:**
- id (primary key)
- workspace_id (foreign key, required)
- parent_id (foreign key to folders.id, nullable for root folders)
- name (text)
- created_at, updated_at

**Documents table:**
- id (primary key)
- workspace_id (foreign key, required)
- folder_id (foreign key to folders.id, nullable for root documents)
- name, is_archived, is_private, etc.

**Cycle Prevention Strategy:**

We prevent cycles through application-layer validation when moving/creating folders:

1. When setting a folder's parent_id, traverse up the ancestry chain to verify the target parent is not a descendant of the folder being moved
2. Implement a recursive CTE query or iterative check that walks up from the target parent_id following parent_id links
3. If the folder's own id appears in the ancestry chain, reject the operation
4. Enforce a maximum depth check (10 levels) as a sanity limit during the same validation

Example validation pseudocode:
```
function canSetParent(folderId, newParentId):
  if newParentId is null: return true // root level

  depth = 0
  currentId = newParentId

  while currentId is not null and depth < 10:
    if currentId == folderId:
      return false // cycle detected
    currentId = getParent(currentId)
    depth++

  if depth >= 10:
    return false // max depth exceeded

  return true
```

This approach keeps the database schema simple while preventing cycles and enforcing depth limits at the application layer. See dotcom app for reference implementation of hierarchical data validation.

### Authentication & Authorization

Q: How does Better Auth integrate with Supabase RLS (Row Level Security)?

A: Better Auth provides session tokens that can be validated in RLS policies. We should use RLS for database-level security.

Q: Do we enforce permissions at the API layer, database layer, or both?

A: We enforce permissions at both layers. RLS provides database-level security, while the API layer validates business logic. See the dotcom app for reference implementation.

Q: How do we validate permissions in the Cloudflare sync worker?

A: We should validate session tokens in worker requests before allowing sync connections. See the dotcom sync-worker for reference implementation.

Q: What is our session management strategy—JWT or sessions in the database?

A: We should use Better Auth's session management with email and password authentication only (no OAuth for MVP). OAuth providers can be added post-MVP. See the dotcom app for reference implementation.

### Multiplayer & Sync

Q: How do we connect the Cloudflare sync worker to Supabase?

A: We should use the Supabase client in the worker with a service role key for permissions checks. See the dotcom sync-worker for reference implementation.

Q: Where do we persist tldraw document snapshots?

A: We persist snapshots to R2 storage. The sync worker persists snapshots periodically. See the dotcom sync-worker for reference implementation.

Q: How do we handle conflicts between app-level data (Supabase) and canvas data (sync worker)?

A: There should be no conflict because the canvas data is separate from the application data.

Q: What's the reconnection strategy if the WebSocket connection drops?

A: The tldraw SDK handles reconnection automatically. See the dotcom app for reference implementation.

Q: How do we scale the sync worker for multiple concurrent documents?

A: We use Cloudflare Durable Objects with one instance per document. See the dotcom sync-worker for reference implementation.

### Presence System

Q: Is presence stored in Supabase real-time or only in the sync worker?

A: Real-time application data, such as the names of files that are being viewed, should be stored in Supabase real-time. Only the canvas uses the tldraw sync worker for high-performance real-time updates.

Q: How do we track which documents users are viewing (not just editing)?

A: We should use Supabase Realtime presence with document IDs. Update presence on document enter and exit. See the dotcom app for reference implementation.

Q: Does presence need to persist across page refreshes?

A: Yes, presence should persist across page refreshes.

## User Experience & Edge Cases

### Invitation Flow

Q: What happens if an unauthenticated user clicks an invite link—do we redirect to signup then back?

A: Yes, we redirect unauthenticated users to signup and then back to the invite link.

Q: Can invitation links have expiration dates, or can we only enable or disable them?

A: Invitation links can only be enabled or disabled, not given expiration dates.

Q: Should there be any rate limiting on invitation link usage?

A: Yes, we should implement rate limiting on invitation link usage.

### Document Sharing

Q: Can a guest who's editing a public document see other guests, or only workspace members?

A: Guests can see other guests editing the document.

Q: What happens if a document is made private while guests are actively editing?

A: Guests will be exited from the document into the same screen they would see if they did not have access to the document.

Q: Do we need any analytics on who's viewing public documents?

A: We only need to show the user that there are guests present in a document; we do not need to show the user the exact number of guests.

### Workspace Management

Q: What happens to documents when a workspace is deleted?

A: We implement a soft delete. The documents remain in the workspace, however the workspace is marked as "deleted". Documents within deleted workspaces cannot be viewed. To access a document, the owning workspace must not be deleted.

Q: Can documents be moved between workspaces?

A: If a user has created a document, they may move it between workspaces. If a user has not created a document, they may not move it between workspaces; instead, they may duplicate the document to its new location.

Q: What's the user flow for discovering their workspaces—is the dashboard the only entry point?

A: Yes, the dashboard is the only entry point for discovering workspaces.

### Private Workspace

Q: Can users rename their private workspace?

A: No, users cannot rename their private workspace.

Q: Can the private workspace be deleted?

A: No, the private workspace cannot be deleted. A user must delete their account to delete their private workspace.

Q: Does the private workspace appear in the same sidebar list as shared workspaces?

A: Yes, the private workspace appears in the same sidebar list as shared workspaces.

## Performance & Scale

### Database Queries

Q: How do we efficiently query all workspaces and their documents for the dashboard sidebar?

A: We should use Supabase joins with proper indexes. Fetch workspace memberships and documents in a single query. See the dotcom app for reference implementation.

Q: What is our pagination strategy for large folder and document lists?

A: We should use cursor-based pagination with limit and offset. Consider virtual scrolling for the UI. See the dotcom app for reference implementation.

Q: What is our indexing strategy for frequently accessed queries?

A: We should index on foreign keys (workspace_id, parent_id, user_id) and created_at for sorting. See the dotcom app for reference implementation.

### Caching

Q: Do we cache workspace membership checks?

A: Yes, we should use a short-lived cache (5-10 seconds) in the worker or API routes. See the dotcom app for reference implementation.

Q: Do we cache document permission checks?

A: Yes, we cache permission checks alongside membership checks and invalidate them when permissions change. See the dotcom app for reference implementation.

Q: How do we invalidate caches when permissions change?

A: We should use Supabase Realtime to listen for permission and membership changes and clear relevant caches. See the dotcom app for reference implementation.

### Real-time Updates

Q: Besides canvas sync, what app-level changes need real-time updates (new documents, folder changes, member additions)?

A: Canvas data has its own channel for real-time updates. The application data should include real-time-ish updates for names of files, names of workspaces, which workspaces exist or do not exist, permissions and access, membership, and presence data of which documents are being viewed by which other users.

Q: Do we use Supabase real-time for app data, or polling?

A: We use Supabase real-time for app data.

## Deployment & Infrastructure

### Environment Setup

Q: Should we use separate Supabase projects for dev, staging, and prod?

A: Yes, we should use separate Supabase projects for each environment.

Q: How many Cloudflare workers are needed (one for sync, others for API routes)?

A: We need one Cloudflare worker for sync.

Q: Where does the Next.js app deploy (Vercel or Cloudflare Pages)?

A: The Next.js app deploys to Vercel.

### Monorepo Structure

Q: How does this fit into the existing tldraw monorepo?

A: This is a new application to be used as a reference implementation for downstream users.

Q: Should we have separate packages for client, sync-worker, and shared types?

A: Yes, there are three folders in simple-dotcom: simple-client, simple-worker, and simple-shared.

Q: How do we share code between Next.js API routes and Cloudflare workers?

A: There is a simple-shared folder that contains shared types and utilities.

## Missing Specifications

### Document Types

Q: The README mentions "board" is the only type currently—what other types are planned?

A: We are potentially planning text, presentations, mindmaps, or other variants on the whiteboard using the tldraw canvas.

Q: Will there be different permissions or behaviors for different document types?

A: Different permissions are not included in the MVP, but they would likely be the same across document types.

### User Profile

Q: What user profile fields do we need (username, name, avatar, email)?

A: For MVP, we need basic profile fields: name, email, and display name. Advanced profile features like avatars and custom display settings are post-MVP.

Q: Can users set display names different from their email?

A: Yes, users can set display names different from their email. A user's email should never be shown to other users.

### Error Handling

Q: What happens if the sync worker is down?

A: The tldraw SDK shows a connection error state. The document becomes read-only until reconnected. See the dotcom app for reference implementation.

Q: Do we support offline editing or just error states?

A: The tldraw SDK supports local editing with a sync queue during intermittent connections. Changes persist when the connection is restored. However, the application UI requires an active connection for workspace and document browsing. The application should notify users when they are offline. See the dotcom app for reference implementation.

Q: How do we handle Supabase rate limits?

A: We should implement exponential backoff and request queuing. We should monitor rate limit headers. See the dotcom app for reference implementation.

### Search & Discovery

Q: Is there any search functionality for documents across workspaces?

A: Yes, for the MVP we will implement a simple search by document name.

Q: How many recent documents should we display, and where should we store them?

A: We'll display recent documents in the sidebar as a separate list, perhaps as a tab between workspaces and a flat list of recent documents.

### Notifications

Q: Do users get notified when added to a workspace?

A: A user "adds themselves" to a workspace when they visit an invitation link. They are immediately added to the workspace.

Q: Are there any in-app or email notifications?

A: We should have a system for notifications, but not for the MVP.

### Audit Log

Q: Do we track document history (who edited when)?

A: Document snapshots are automatically persisted to R2 for backup purposes. For MVP, we track document creator, creation timestamp, and last modified timestamp. The UI to view detailed edit history and restore specific snapshots is a post-MVP feature.

Q: Is there a workspace activity log for owners?

A: Workspace activity logs are a post-MVP feature.

### Limits & Quotas

Q: What is the maximum number of members per workspace?

A: We should implement a sanity limit of 100 members per workspace.

Q: What is the maximum number of documents per workspace?

A: We should implement a sanity limit of 1000 documents per workspace.

Q: Are there storage limits per user or workspace?

A: There are no storage limits for MVP.

## Dependencies & Risks

### Third-party Services

Q: What's our contingency if Better Auth doesn't meet our needs?

A: We can migrate to Supabase Auth or a custom JWT solution. We should keep the auth layer abstracted. See the dotcom app for reference implementation.

Q: What are the Supabase pricing implications at scale?

A: The pricing implications are acceptable.

Q: What are the Cloudflare Workers limitations (CPU time, memory, WebSocket connections)?

A: Cloudflare Workers have 50ms CPU time per request (paid plan) and 128MB memory. Durable Objects handle long-lived WebSocket connections. See the dotcom sync-worker for reference implementation.

## Timeline & Resources

Q: What is the estimated team size needed?

A: We estimate 2-3 engineers for MVP: 1 frontend, 1 backend/infrastructure, and 1 full-stack.

Q: Which components can be built in parallel?

A: Frontend UI and backend API can be built in parallel. Sync worker setup is independent. Authentication can start immediately.

Q: Is there any existing code we can reuse from other templates or dotcom?

A: Yes, we can reuse sync worker setup from dotcom sync-worker, authentication patterns from dotcom, and tldraw integration from templates. See the dotcom app and templates/ for reference implementations.

## Testing

### End-to-End Testing

Q: What should our end-to-end testing strategy cover?

A: E2E tests should cover critical user flows: authentication (signup, login, logout), workspace management (create, invite members, delete), document operations (create, rename, move, archive, delete), folder management (create, nest, move documents), multiplayer sync (concurrent editing, presence), and permission enforcement (public/private documents, guest access).

Q: What testing framework should we use for E2E tests?

A: We should use Playwright for E2E tests, following the pattern used in the dotcom app. See `apps/dotcom/client/e2e/` for reference implementation.

Q: How do we test multiplayer and real-time features?

A: We should use multiple browser contexts in Playwright to simulate concurrent users. Test scenarios should include: multiple users editing the same document, presence indicators appearing/disappearing, real-time document list updates, and permission changes affecting active sessions.

Q: Should E2E tests run against a real or mock backend?

A: E2E tests should run against a test Supabase project and test Cloudflare Worker deployment to validate the full stack integration. Use database seeding and cleanup between test runs.

Q: What are the critical flows that must be covered by E2E tests for MVP?

A: Critical flows include: new user signup and workspace creation, invitation link flow (send invite, accept invite, join workspace), create and edit document with sync, folder operations (create, nest, move documents between folders), archive and restore document, move document between workspaces, make document public and access as guest, and permission enforcement (attempt unauthorized access).

Q: How do we handle test data cleanup and isolation?

A: Each test suite should use unique test users and workspaces. Implement setup and teardown hooks to create and delete test data. Use Supabase test project with RLS disabled for test service account to enable full cleanup.

Q: What performance benchmarks should E2E tests validate?

A: Tests should validate that document loads complete within 2 seconds, sync latency between users is under 200ms, workspace sidebar queries complete within 1 second, and search results return within 500ms. These are reference benchmarks, not hard requirements.

## Current Design

Q: What's the current design of the application?

A: There is no current design. The expectation is to take a first pass at it and have designers come in second to iterate and polish.

Q: What's the current design of the tldraw canvas?

A: The canvas design is complete. See documentation at tldraw.dev.

Q: What's the current design of the sidebar?

A: There is no current design. The expectation is to take a first pass at it and have designers come in second to iterate and polish.
