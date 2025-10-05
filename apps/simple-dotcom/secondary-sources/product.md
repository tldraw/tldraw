# Simple tldraw app

A collaborative whiteboard application built on tldraw, featuring real-time multiplayer editing, workspace management, and flexible document sharing.

## Overview

This application combines the tldraw infinite canvas with Supabase for data persistence and real-time collaboration. Users can organize their work in private or shared workspaces, with granular control over document access and permissions.

## MVP Scope

### P0 Features (Required for Launch)

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

### Post-MVP Features

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

## Core Features

### Workspaces

**Private Workspace**

- Every user gets a personal workspace upon account creation
- Only accessible to the owner
- Full control over all documents and folders

**Shared Workspaces**

- Create workspaces and invite collaborators via shareable link
- Each workspace has a unique invitation link
- Workspace owners can enable/disable invitation links or regenerate them
- Workspace owners have full administrative control
- Members have access to all workspace files
- Both owners and members can create, edit, and organize content

### Document Management

**Document Operations**

- Create board documents (additional types coming soon)
- Rename, duplicate, delete, and archive documents
- Organize documents in nested folder structures
- Every workspace includes an archive for archived items

**Document Metadata**

- Original creator tracking
- Creation timestamp
- Last modified timestamp

### Permissions & Sharing

**Workspace-Level Access**

- Users can only access workspaces they own or are members of
- All workspace members have full edit access to workspace documents

**Document-Level Sharing**

- Share individual documents outside the workspace via link
- Three sharing modes:
  - **Private**: Only workspace members can access
  - **Public (read-only)**: Anyone with the link can view
  - **Public (editable)**: Anyone with the link can edit
- Only workspace members can modify sharing settings
- Guest permissions are enforced at both the application and canvas level

### Real-Time Collaboration

**Multiplayer Editing**

- Powered by tldraw sync for seamless real-time collaboration
- Multiple users can edit the same document simultaneously
- Changes sync instantly across all connected clients

**Presence System**

- See who is viewing or editing each document
- Real-time cursor and selection tracking
- Visual indicators of active collaborators

## Technical Architecture

- **Canvas**: tldraw infinite canvas
- **Multiplayer**: tldraw sync with Cloudflare Durable Objects + WebSockets
- **Database**: Supabase PostgreSQL with real-time subscriptions
- **Storage**: Cloudflare R2 for document snapshots and canvas data
- **Authentication**: Better Auth (https://www.better-auth.com/) with email and password only (no OAuth for MVP)
- **UI Framework**: Next.js with Tailwind CSS and shadcn components (Radix UI primitives)
- **Deployment**: Vercel (Next.js app), Cloudflare Workers (sync)
- **Permissions**: Row Level Security (RLS) in Supabase + API layer validation
- **Testing**: Playwright for end-to-end tests

### Component Architecture Pattern

**Server Components First:**
- All authenticated pages should use Next.js Server Components for initial data fetching
- Better Auth session validation happens server-side before rendering
- Data is fetched directly from Supabase on the server and passed as props
- Unauthenticated users are redirected server-side (no client-side flash)

**Client Components for Interactivity:**
- Use `'use client'` directive only for components requiring:
  - Form state management and submissions
  - Interactive UI elements (modals, dropdowns, collapsible sections)
  - Client-side state mutations
  - Real-time updates and subscriptions
- Client components receive initial data from Server Component parents

**Benefits:**
- Faster initial page loads (data arrives with HTML)
- Reduced client-side JavaScript bundle size
- Better SEO and Core Web Vitals
- No loading states on mount for initial data
- Improved security (auth checks happen server-side)

**Reference Implementation:** See `apps/simple-dotcom/simple-client/src/app/dashboard/page.tsx` for the Server Component pattern and `dashboard-client.tsx` for the Client Component pattern.

### Data Model

**Folders:**
- Nested folder structures using adjacency list model (parent_id references)
- Application-layer cycle prevention through ancestry chain validation
- Maximum depth limit of 10 levels enforced during folder operations
- Both documents and folders can be organized hierarchically within workspaces

**Documents:**
- Canvas data stored in Cloudflare R2
- Application metadata (name, permissions, timestamps) stored in Supabase
- Document snapshots persisted periodically to R2 for versioning
- Documents can be organized in folders or at workspace root level

**Workspaces:**
- Each user gets a private workspace on signup (cannot be deleted or renamed)
- Shared workspaces support multiple members with owner/member roles
- Soft delete for workspaces (documents remain but become inaccessible)
- Invitation links can be enabled/disabled or regenerated by workspace owners

## Frequently Asked Questions

### Getting Started

**What happens when I create an account?**
You're automatically placed into your own private workspace where you can start creating documents immediately. This workspace is exclusive to you and cannot be shared with other users.

**What kind of account does this application require?**
This application requires an email and password account. OAuth providers are not supported for MVP.

**Can I create multiple workspaces?**
Yes. In addition to your private workspace, you can create as many shared workspaces as you need and invite collaborators to join them.

**How do I invite someone to my workspace?**
Every workspace has a shareable invitation link. Simply share this link with anyone you want to invite. When they visit the link (while authenticated), they instantly become members with full access to all documents and folders in that workspace. As a workspace owner, you can disable the invitation link to prevent new members from joining, or regenerate a new link (which invalidates all previous links).

### Workspaces

**What's the difference between a private workspace and a shared workspace?**
A private workspace is personal and can only be accessed by you. A shared workspace can have multiple members who all have access to the workspace's documents and folders.

**What's the difference between a workspace owner and a member?**
Workspace owners are the users who created the workspace and have full administrative control. Members are invited users who have access to all workspace content but didn't create the workspace. Both owners and members can create, edit, and organize documents.

**Can I convert my private workspace into a shared workspace?**
No, your private workspace remains private. To collaborate, create a new shared workspace and invite others.

**Can I leave a workspace I'm a member of?**
Yes, members can leave shared workspaces at any time. Workspace owners cannot leave their own workspaces.

**What happens if a workspace owner leaves?**
Workspace owners must transfer ownership to another member before leaving. If there are no other members, the workspace must be deleted first.

**Can I transfer ownership of a workspace?**
Yes. As a workspace owner, you can transfer ownership to any other member of the workspace. Once transferred, you become a regular member and the new owner gains full administrative control.

## Workspace Permissions

The following table shows all actions that can be performed on a workspace and which user roles can perform them:

| Action                                | Owner | Member | Guest |
| ------------------------------------- | ----- | ------ | ----- |
| View workspace                        | x     | x      |       |
| View workspace documents list         | x     | x      |       |
| View workspace folders                | x     | x      |       |
| Create documents                      | x     | x      |       |
| Create folders                        | x     | x      |       |
| Rename documents                      | x     | x      |       |
| Rename folders                        | x     | x      |       |
| Delete documents                      | x     | x      |       |
| Delete folders                        | x     | x      |       |
| Duplicate documents                   | x     | x      |       |
| Archive documents                     | x     | x      |       |
| Restore archived documents            | x     | x      |       |
| Permanently delete archived documents | x     | x      |       |
| Move documents between folders        | x     | x      |       |
| Move folders                          | x     | x      |       |
| Change document sharing settings      | x     | x      |       |
| View document metadata                | x     | x      |       |
| Edit workspace name                   | x     |        |       |
| Edit workspace details                | x     |        |       |
| View workspace members                | x     | x      |       |
| Copy invitation link                  | x     | x      |       |
| View invitation link settings         | x     |        |       |
| Enable/disable invitation link        | x     |        |       |
| Regenerate invitation link            | x     |        |       |
| Remove members                        | x     |        |       |
| Transfer ownership                    | x     |        |       |
| Delete workspace                      | x     |        |       |
| Leave workspace                       | [1]   | x      |       |
| Access workspace settings             | x     | x[2]   |       |

**Footnotes:**

1. Owners cannot leave a workspace. To leave a workspace, an owner must transfer ownership to another member. Alternatively, the owner can delete the workspace.
2. Members can access workspace settings in read-only mode and can leave the workspace

### Documents & Folders

**What types of documents can I create?**
Currently, the only document type available is "board" (a tldraw canvas). Additional document types may be added in the future.

**How do folders work?**
Folders can contain both documents and other folders, allowing you to create nested hierarchies. Both private and shared workspaces support folder structures.

**What's the difference between deleting and archiving a document?**
Archiving moves a document to the workspace's archive where it can be restored later. Deleting permanently removes the document.

**Can I recover archived documents?**
Yes, every workspace has an archive section where you can view and restore archived documents.

**Can I move documents between workspaces?**
If you created a document, you can move it between workspaces. If you did not create a document, you can duplicate it to another workspace but cannot move the original.

**Can I move documents between folders?**
Yes, documents can be moved between folders within the same workspace.

**Who can rename or delete documents?**
All workspace members (both owners and members) can rename, delete, duplicate, and archive documents within their workspaces.

### Permissions & Sharing

**If I'm not part of a workspace, can I access any of its documents?**
Not by default. You can only access documents in workspaces where you're an owner or member, unless a specific document has been shared publicly.

**How does document sharing work?**
Any workspace member can share individual documents by generating a link. The document's sharing settings control what people with that link can do.

**What are the sharing options for documents?**

- **Private**: Only workspace members can access (default)
- **Public (read-only)**: Anyone with the link can view but not edit
- **Public (editable)**: Anyone with the link can view and edit

**Can guests who access a shared document modify its sharing settings?**
No. Only workspace members can change a document's sharing settings or toggle between public and private.

**If a document is set to "public (editable)", can anyone edit it?**
Anyone with the link can edit the document content, but they cannot change the document's settings, permissions, rename it, delete it, or move it to another folder. Those actions are restricted to workspace members.

**Do sharing settings apply inside the tldraw canvas too?**
Yes. Permissions are enforced consistently. If someone has read-only access to a document, they'll also have read-only access within the tldraw canvas itself.

**Can I share an entire folder?**
The system currently supports document-level sharing. Folders themselves cannot be shared, but you can share multiple documents individually.

**What happens if I make a document private after sharing it publicly?**
Once you change a document from public to private, people with the link will no longer be able to access it unless they're members of the workspace.

### Real-Time Collaboration

**How does multiplayer editing work?**
The application uses tldraw sync to enable real-time collaboration. Multiple users can edit the same document simultaneously, and changes appear instantly for all connected users.

**Can I see who else is viewing or editing a document?**
Yes. The presence system shows you which users are currently viewing or editing each document. You can see their cursors and selections in real-time within the canvas.

**What happens if two people edit the same thing at the same time?**
tldraw sync handles conflict resolution automatically, merging changes intelligently to prevent data loss.

**Do I need to save my work manually?**
No. All changes are automatically saved in real-time to the Supabase database.

**Can I work offline?**
The tldraw canvas supports local editing with a sync queue during intermittent connections. Changes persist when the connection is restored. However, the application UI requires an active connection for workspace and document browsing. The application will notify you when you are offline.

### Document Metadata

**Can I see who created a document?**
Yes. Every document tracks its original creator along with creation and last modified timestamps.

**Can I see the edit history of a document?**
Document snapshots are automatically persisted to R2 storage for backup purposes, but the UI to view and restore specific snapshots is a post-MVP feature. The MVP tracks document creator, creation timestamp, and last modified timestamp.

**What happens to document metadata when I duplicate a document?**
The duplicate becomes a new document with you as the creator and a new creation timestamp.

### Technical Questions

**What is tldraw?**
tldraw is an infinite canvas SDK for React applications. It provides a flexible drawing and diagramming canvas with built-in tools.

**What is tldraw sync?**
tldraw sync is the multiplayer synchronization system that enables real-time collaboration on tldraw canvases.

**What is Supabase?**
Supabase is an open-source Firebase alternative providing a PostgreSQL database with real-time subscriptions, authentication, and other backend services.

**Can I export my documents?**
Document export features (PDF, PNG, SVG) are planned as a post-MVP feature. The tldraw SDK supports various export formats that will be exposed in a future release.

**Is my data encrypted?**
Data encryption depends on the Supabase configuration and application implementation. Supabase supports encryption at rest and in transit.

**Can I use this application with my own Supabase instance?**
This would require configuration changes to point to your own Supabase project.

## Site Map

This sitemap represents the proposed route structure for the application based on its features and functionality.

### Public Routes

**`/`** - Landing Page

- Marketing homepage with product overview
- Call-to-action to sign up or log in
- Feature highlights and value proposition
- **Role**: Unauthenticated visitor

**`/login`** - Login Page

- User authentication
- Email and password login only
- Link to sign up page
- **Role**: Unauthenticated visitor

**`/signup`** - Sign Up Page

- New user registration
- Account creation form
- Automatic private workspace creation
- **Role**: Unauthenticated visitor

**`/forgot-password`** - Password Recovery

- Initiate password reset flow
- Email verification
- **Role**: Unauthenticated visitor

**`/reset-password`** - Password Reset

- Complete password reset with token
- Set new password
- **Role**: Unauthenticated visitor

### Authenticated Routes

**`/dashboard`** - Main Dashboard

- Overview of all accessible workspaces displayed simultaneously
- Sidebar with collapsible sections for each workspace
- Quick access to all workspaces and their documents at once
- Recent documents across all workspaces
- No workspace switcher needed - all workspaces visible
- **Role**: Authenticated user (owner or member of displayed workspaces)

### Workspace Routes

**`/workspace/[workspaceId]`** - Workspace Home

- Document and folder browser for a specific workspace
- Create new documents and folders
- Workspace navigation sidebar
- Archive access
- **Role**: Owner or Member
  - Both can view, create, edit, organize all documents and folders
  - Both have full access to workspace content

**`/workspace/[workspaceId]/settings`** - Workspace Settings

- **Role: Owner**
  - Edit workspace name and details
  - Manage member list
  - Manage invitation link:
    - View current invitation link
    - Enable/disable invitation link
    - Regenerate invitation link (invalidates previous links)
  - Transfer ownership to another member
  - Remove members
  - Delete workspace
  - Leave workspace (requires transferring ownership first if other members exist)
- **Role: Member**
  - View workspace details (read-only)
  - Leave workspace option

**`/workspace/[workspaceId]/members`** - Member Management

- **Role: Owner**
  - View all workspace members
  - Copy invitation link
  - Remove members
- **Role: Member**
  - View all workspace members (read-only)
  - Copy invitation link
  - Cannot remove members

**`/workspace/[workspaceId]/archive`** - Workspace Archive

- View archived documents
- Restore or permanently delete archived items
- **Role**: Owner or Member
  - Both can restore archived documents
  - Both can permanently delete archived documents

### Folder Routes

**`/workspace/[workspaceId]/folder/[folderId]`** - Folder View

- Browse documents and subfolders within a folder
- Create new documents and subfolders
- Folder breadcrumb navigation
- **Role**: Owner or Member
  - Both can create, rename, move, and delete folders
  - Both have full folder management capabilities

### Document Routes

**`/d/[documentId]`** - Document View

This route serves different experiences based on the user's role:

- **Role: Member (Owner or Member of document's workspace)**
  - Full tldraw canvas editing capabilities
  - Real-time collaboration and presence
  - Document controls: rename, duplicate, delete, archive
  - Sharing controls: toggle public/private, set read-only/editable permissions
  - View document metadata (creator, timestamps)
  - Access to workspace chrome/navigation
  - Can move document between folders within workspace
  - Can move document between workspaces (if user is document creator)

- **Role: Guest - Public (Editable)**
  - Access via shared link when document is set to "public (editable)"
  - Can edit tldraw canvas content
  - Real-time collaboration and presence visible
  - No document management controls (cannot rename, delete, archive, move)
  - Cannot change sharing settings or permissions
  - No workspace chrome/navigation
  - Limited to canvas interaction only

- **Role: Guest - Public (Read-only)**
  - Access via shared link when document is set to "public (read-only)"
  - Can view tldraw canvas (read-only mode)
  - Can see other users' presence but cannot edit
  - No document management controls
  - Cannot change sharing settings or permissions
  - No workspace chrome/navigation
  - View-only canvas interaction

- **Role: Guest - Private Document**
  - 403 Forbidden - Cannot access
  - Redirected to error page if attempting to access via link

### User Routes

**`/profile`** - User Profile

- View and edit user profile information
- Account settings
- Preferences
- **Role**: Authenticated user (own profile)

**`/settings`** - Account Settings

- User account management
- Email and password changes
- Notification preferences
- Privacy settings
- **Role**: Authenticated user (own settings)

### Invitation Routes

**`/invite/[inviteToken]`** - Workspace Invitation

- Instant workspace access via shareable link
- Requires authentication (redirects to login if not authenticated)
- **Role**: Authenticated user
  - Automatically becomes a Member of the workspace upon visiting the link
  - No accept/decline step - joining is immediate
  - If invitation link is disabled or has been regenerated, shows error
  - If already a member, redirects to workspace

### API Routes

**`/api/auth/*`** - Authentication API

- Better Auth authentication endpoints
- Session management
- Email and password authentication only (no OAuth for MVP)
- Session validation and refresh

**`/api/workspaces`** - Workspace API

- CRUD operations for workspaces
- List user's workspaces

**`/api/workspaces/[workspaceId]/documents`** - Document API

- Create, read, update, delete documents
- List workspace documents

**`/api/workspaces/[workspaceId]/folders`** - Folder API

- CRUD operations for folders
- Folder hierarchy management

**`/api/workspaces/[workspaceId]/members`** - Member API

- List workspace members
- Remove members from workspace
- Join workspace via invitation token
- Transfer ownership to another member (owner only)

**`/api/workspaces/[workspaceId]/invite`** - Invitation Link API

- Get current invitation link
- Enable/disable invitation link
- Regenerate invitation link (invalidates previous tokens)
- Validate invitation token

**`/api/documents/[documentId]/share`** - Document Sharing API

- Update document sharing settings
- Toggle public/private status
- Set read-only/editable permissions

**`/api/documents/[documentId]`** - Document Details API

- Get document metadata
- Update document properties
- Check user permissions

**`/api/presence`** - Presence API

- Real-time presence updates
- Track active users in documents

### Error Routes

**`/404`** - Not Found

- Custom 404 error page
- Shown when route or resource doesn't exist
- **Role**: Any user

**`/403`** - Forbidden

- Access denied page for unauthorized access attempts
- Shown when user tries to access:
  - Private document without membership
  - Workspace they're not a member of
  - Admin functions without owner role
- **Role**: Any user (insufficient permissions)

**`/500`** - Server Error

- Error page for server-side errors
- **Role**: Any user

## Implementation Details

### Folder Hierarchy & Cycle Prevention

The application uses an adjacency list model for folder hierarchy with parent_id references. To prevent cycles and enforce depth limits:

**Schema:**
```sql
folders (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  parent_id UUID REFERENCES folders(id),
  name TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**Validation Logic:**
When moving or creating folders, the application validates that:
1. The target parent is not a descendant of the folder being moved
2. The operation does not exceed the maximum depth of 10 levels
3. No cycles are introduced in the folder tree

This is enforced through ancestry chain traversal that walks up from the target parent, checking that the folder's own ID does not appear in the chain.

### Performance Considerations

**Database Indexing:**
- Foreign keys (workspace_id, parent_id, user_id)
- created_at for sorting recent items
- Composite indexes for common query patterns

**Caching Strategy:**
- Short-lived cache (5-10 seconds) for permission checks
- Immediate cache invalidation via Supabase Realtime on permission changes
- Workspace membership cached in worker/API routes

**Real-time Updates:**
- Canvas sync uses dedicated tldraw sync worker channel
- Application data (document names, workspace changes, presence) uses Supabase Realtime
- Separate channels prevent canvas performance impact from app-level updates

**Resource Limits:**
- 10MB maximum document size
- 10 levels maximum folder nesting depth
- 100 members per workspace (sanity limit)
- 1000 documents per workspace (sanity limit)

### Testing Strategy

**End-to-End Testing:**
The application uses Playwright for E2E tests covering:
- Authentication flows (signup, login, logout)
- Workspace management (create, invite, delete)
- Document operations (create, rename, move, archive)
- Folder operations (create, nest, move documents)
- Multiplayer sync (concurrent editing, presence)
- Permission enforcement (public/private, guest access)

**Test Environment:**
- Separate Supabase test project
- Test Cloudflare Worker deployment
- Database seeding and cleanup between test runs
- Multiple browser contexts for multiplayer testing

**Performance Benchmarks:**
- Document load: < 2 seconds
- Sync latency: < 200ms between users
- Workspace queries: < 1 second
- Search results: < 500ms

These are reference benchmarks to guide development, not hard requirements.
