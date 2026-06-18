# Workspaces feature review

Reviewed on June 17, 2026.

This document describes the current workspaces implementation in the dotcom app. It starts with the data model and permission concepts, then describes the main rules, user journeys, and multiplayer scenarios. It is written as a product and engineering review of the current behavior, not as a proposal for a new design.

## Basic concepts

### Home workspace

Every migrated user has a home workspace. Its group id is the same as the user id. It appears as "My workspace" or the user's home workspace name in the sidebar.

The home workspace is a real `group` and the user has an owner `group_user` row for it, but it is special:

- It can be renamed.
- It cannot be invited to.
- It cannot be left.
- It cannot be deleted.
- Its members cannot be managed.

The home workspace also acts as the landing place for shared files that a user opens and that do not already belong to one of the user's workspaces.

### Workspace

A non-home workspace is a `group`. A workspace contains members through `group_user` rows and files through `group_file` rows.

The workspace sidebar is based on the user's synced workspace memberships. If a user is not a member of a workspace, that workspace is not part of their sidebar graph, even if they can still access one of its files through a shared link.

### Membership

A membership is a `group_user` row. It stores:

- The user id.
- The workspace id.
- The role.
- A per-user workspace ordering index.
- Denormalized user name and color for member lists.

Membership is the source of workspace-level authority. A member can see the workspace, see its member list, and see the workspace's files.

### File ownership and file listing

A file has exactly one owner:

- Legacy files have `ownerId`.
- Workspace files have `owningGroupId`.

A workspace file also has a `group_file` row for the workspace that owns it. A `group_file` row can also represent a link to a shared file in another workspace. In that case, the file is listed in the workspace, but its `owningGroupId` remains somewhere else.

This distinction matters:

- Moving an owned file transfers `owningGroupId` and moves the owning `group_file` row.
- Removing a linked file removes the link, not the underlying file.
- Deleting/removing an owned workspace file marks the file deleted for everyone.

### File state

`file_state` is per user and per file. It tracks visit and session state. In the migrated workspace model, pinned state for workspace lists is stored on `group_file.index`, not on `file_state.isPinned`.

When a user opens a shared file, the server upserts `file_state`. For migrated users, if the file is not in any of their current workspaces, the server also inserts a `group_file` link into their home workspace.

### Shared links

Files have `shared` and `sharedLinkType`.

- `shared = false` means invite-only access.
- `shared = true` and `sharedLinkType = view` means guests can open read-only.
- `shared = true` and `sharedLinkType = edit` means guests can edit the live canvas.

New workspace files are created as shared edit links by default. Moving a file between workspaces does not change `shared` or `sharedLinkType`.

Metadata permissions are stricter than canvas access. A shared-link guest can be allowed to edit the canvas, but cannot use workspace metadata mutators such as rename, share settings, move, or delete unless they are a member of the owning workspace.

### Active workspace

The active workspace is derived from the current file URL, not stored separately. If the current file is visible through a workspace membership and that file has an `owningGroupId`, that owning workspace is active. Otherwise the active workspace falls back to the user's home workspace.

This means a user can be viewing a shared file while the sidebar is showing the home workspace. That happens when the user has file access but is not a member of the file's owning workspace.

### Feature flags

Two flags matter:

- `groups_backend` enables the workspace data model and backend mutators.
- `groups_frontend` enables the workspace sidebar and workspace UI.

The backend invite accept route requires the user to already have `groups_backend`; it rejects accept attempts from users without it. For users who do have `groups_backend` but not `groups_frontend`, the route adds `groups_frontend` on accept.

## Permission model

Workspace authorization is capability-based. The current roles are:

| Role   | Capabilities                                                               |
| ------ | -------------------------------------------------------------------------- |
| Member | Access files, add files, remove files, manage invites                      |
| Owner  | Member capabilities, plus rename workspace, edit members, delete workspace |

Important consequences:

- Any member can open and edit workspace files.
- Any member can move files into a workspace they belong to.
- Any member can remove files from a workspace they belong to.
- Any member can regenerate the workspace invite link.
- The home workspace can be renamed by its owner.
- For non-home workspaces, only owners can rename the workspace, change roles, remove members, or delete the workspace.
- The last owner cannot be demoted, removed, or leave. This is not a capability; it is enforced as an explicit invariant check in the `setWorkspaceMemberRole`, `removeWorkspaceMember`, and `leaveWorkspace` mutators.

The client hook named `useHasFileAdminRights` currently returns true for any member of the file's owning workspace, because it checks the `accessFiles` capability. In practice, all workspace members see file-level owner/admin affordances for workspace-owned files: rename, sharing, publishing, deleting, and similar controls. The name is narrower than the behavior.

## Data sync model

The user durable object syncs:

- The current user.
- The user's `file_state` rows and related files.
- The user's workspace memberships.
- All members of those workspaces.
- All `group_file` rows for those workspaces.
- All files referenced by those workspace file rows.
- Legacy files shared with the user through `file_state`.

The sidebar is built from the workspace graph. For migrated users, `getFile(fileId)` only returns a file if it can be found through one of the user's workspace memberships. A shared file may still be openable through the file durable object even when it is not returned by `getFile`.

When membership or workspace file subscriptions change, the user durable object may do a hard reboot and refetch the graph. That keeps the sidebar consistent after other users move files, delete files, add files, remove members, or delete workspaces.

The live canvas connection is checked separately by the file durable object:

- Workspace members with `accessFiles` can connect with edit access.
- Shared edit guests can connect with edit access.
- Shared view guests can connect read-only.
- Non-members of private files are closed with forbidden.
- Deleted files are closed with not found.

## Core rules

### Creating workspaces

Creating a workspace creates a `group` and an owner `group_user` row for the creator. The client then seeds a welcome file in that workspace.

If a user switches to an empty workspace, the switcher opens the most recent file if there is one, waits for a pending welcome file if one is being created, or creates a new blank file. The workspace UI tries to always land the user on a file.

### Creating files

The sidebar "New file" action creates a file in the active workspace.

Other creation paths may default to the home workspace unless they pass a workspace id. For example:

- The sidebar create button passes the active workspace id.
- The empty-workspace fallback passes the target workspace id.
- Canvas `.tldr` file drops use the current file's owning workspace.
- Sidebar `.tldr` drops and main-menu imports do not pass a workspace id, so imported files default to home.

New migrated files are created with:

- `owningGroupId` set to the target workspace.
- A `group_file` row for that workspace.
- A `file_state` row for the creator.
- `shared = true`.
- `sharedLinkType = edit`.

### Listing and searching files

The recent files list shows files for the active workspace only. Search filters that active workspace list; it is not a global search across every workspace.

Pinned files are first. For migrated users, pinning is per workspace through `group_file.index`. Unpinned files keep a stable local ordering to avoid real-time reorder jumps while files update.

### Opening shared files

When a user opens a file, the backend verifies access. A workspace member, legacy owner, or shared-link visitor can pass the access check.

For migrated users, if the opened file is not already in any workspace the user belongs to, the server inserts a home workspace `group_file` link. This is what makes a shared file appear in the user's home workspace after they visit it.

### Moving files

Moving an owned file requires:

- `removeFiles` in the source workspace.
- `addFiles` in the target workspace.

Members have both capabilities, so any member of both workspaces can move a file between them.

The move:

- Deletes the old owning `group_file` row.
- Updates `file.owningGroupId` to the target workspace.
- Inserts a new `group_file` row for the target workspace.

The move does not change `shared` or `sharedLinkType`.

The file menu's "Move to" action moves the owned file. Drag operations have extra logic for linked files: if the file listed in a workspace is only a link, the drag move can move the link instead of transferring file ownership.

If the "Move to new workspace" flow creates a new workspace and then the move fails, the workspace remains created.

### Removing and deleting files

The delete/forget dialog calls `removeFileFromWorkspace`.

If the workspace owns the file, removal marks the file deleted. Database cleanup then removes file states and group file rows for that file. Connected canvas sessions are closed with not found.

If the workspace only links to the file, removal deletes the link and the actor's file state, but does not delete the file.

Because members have `removeFiles`, any member can delete a file owned by their workspace. In the UI this appears as "Delete" because file admin rights resolve to workspace file access.

After the local actor deletes/removes a file from a workspace, the client navigates to the most recent remaining file in that workspace. If no files remain, it creates a blank file in that workspace and opens it.

### Invites

Non-home workspaces have invite secrets. Members can copy the invite link and regenerate it. Regenerating the secret invalidates previous invite links.

Opening an invite link:

- Stores the token in session storage.
- Prompts unauthenticated users to sign in.
- Fetches invite info after auth and legal acceptance.
- Shows an expired invite dialog if the secret is no longer valid.
- Shows an "already member" result if the user has already joined.
- Adds the user as a member if accepted.

After accepting, the client waits for the workspace membership to appear in sync, then opens the first file in the workspace or returns to root if none is available.

### Workspace settings and members

All members can view the member list. Owners can change member roles and remove members.

Only owners can delete a workspace. Deleting a workspace:

- Deletes the workspace's `group_file` rows.
- Marks files owned by that workspace as deleted.
- Marks the group deleted.
- Removes group memberships through cleanup.
- Closes connected sessions for deleted files with not found.

A member can leave a workspace unless they are the last owner. The local leaving user is navigated to root.

### Unsharing files

When a shared file becomes private, cleanup removes guest `file_state` rows and non-owning `group_file` links. For group-owned files, current members of the owning group keep their file states and home links.

The file durable object also reacts to sharing changes. Guests who no longer have access are closed. Guests whose read/write mode changed are reconnected so their socket mode matches the new sharing state.

## User journeys

### Starting from home

A migrated user starts with a home workspace. The sidebar shows the workspace switcher and the active workspace's files. If the current URL does not resolve to a workspace file visible through the user's memberships, home is active.

### Creating a workspace

The user opens the workspace switcher and chooses to create a workspace. They enter a name. The app creates the workspace, seeds a welcome file, and navigates to that file.

Other members are not present until invited. The creator is an owner.

### Switching workspaces

The user opens the switcher and selects another workspace. The app opens that workspace's top file. If the workspace is empty, it creates or waits for a file so the user lands in an editor rather than an empty screen.

The active workspace then changes because the open file belongs to that workspace.

### Creating a file in a workspace

The user presses the sidebar new-file button. The app creates the file in the active workspace, navigates to it, and starts rename on desktop.

Other members of the workspace receive the new file through sync. Depending on subscription state, their user durable object may refetch the workspace graph before the file appears.

### Sharing a workspace

A member opens workspace settings, copies the invite link, and sends it to someone else. If they regenerate the link later, the old link stops working.

The invited user opens the link, signs in if needed, accepts, and becomes a member. They enter with the member role, not owner.

### Managing members

An owner can promote a member to owner, demote an owner to member, or remove a member. The last owner protection prevents a workspace from ending up with no owners.

A role change updates the affected user's available controls after sync. A removed member loses the workspace from their sidebar graph after sync.

### Moving a file

A member who belongs to both source and destination workspaces can move a file. The file disappears from the source workspace list and appears in the destination workspace list.

If the current viewer also belongs to the destination workspace, their active workspace can update to the destination because the open file now belongs there.

If the current viewer does not belong to the destination workspace, the sidebar can fall back to home while the file remains open through shared-link access.

### Removing a file

If the file is owned by the current workspace, removal is a delete for everyone. Other members lose it from their lists, and active sessions in that file close with not found.

If the file is only linked into the current workspace, removal removes that workspace's link. The file continues to exist in its owning workspace and anywhere else it is linked or shared.

## Multiplayer scenarios

### Another member creates a file in the active workspace

The user's workspace graph gains a `group_file` row and the new file. The sidebar eventually shows it in the active workspace's unpinned list. The file may appear after a user durable object refetch if the new file creates a new subscription.

The user is not navigated away from their current file.

### A user renames their home workspace

The home workspace name updates for that user. The home workspace still cannot be invited to, left, deleted, or have its members managed.

The active file and workspace membership do not change.

### Another owner renames a non-home workspace

The workspace name updates for all members. File owner display fields for files owned by that workspace are also kept in sync by database triggers.

The active file and workspace membership do not change.

### Another member changes a file name

The file name updates in sidebars and in the document metadata. The file durable object updates the `TLDocument` name stored in the room.

### Another member moves the open file to a workspace the user also belongs to

The file's `owningGroupId` changes to the destination workspace. The source workspace loses the file row and the destination workspace gains it.

For the current user:

- The canvas stays connected because they still have workspace access.
- The active workspace can become the destination workspace.
- The sidebar shows the file under the destination workspace, not the source workspace.

### Another member moves the open file to a workspace the user does not belong to

The user's sidebar graph no longer contains the file through the source workspace. Since the active workspace is derived from a visible workspace file, the UI can fall back to home.

The canvas outcome depends on the file's shared state:

- If the file is still shared edit, the user can remain connected and editable as a guest. This is the default for newly-created workspace files.
- If the file is shared view, the user is reconnected or opened as a read-only guest.
- If the file is private, the file durable object closes the session with forbidden.

On a later enter or reload, if the user can still access the file through a shared link and the file is not in any of their workspaces, `onEnterFile` can link it into their home workspace.

This is the most important mental-model mismatch: moving a file to another workspace does not necessarily revoke access, because sharing state is independent and remains unchanged.

### Another member moves a file away before the user opens it

If the user is a member of the destination workspace, the file moves from one workspace list to the other.

If the user is not a member of the destination workspace, the file disappears from their source workspace list. They may still be able to open the file by direct link if it is shared, but it is no longer discoverable through that source workspace.

### Another member deletes the open file

If the file is owned by that workspace, deletion marks the file deleted. Database cleanup removes file states and group file rows. The file durable object closes connected sessions with not found.

The deleting user's client navigates to another file or creates a new one. Other users rely on sync and the closed file session. The current implementation does not present a workspace-specific "this file was deleted by another member" recovery flow in the workspace UI.

### Another member removes a linked file from a workspace

The linked `group_file` row is deleted for that workspace. Members of that workspace stop seeing the linked file there.

The underlying file is not deleted. Users who are also members of the owning workspace, or who have shared-link access, can continue to access it through those paths.

### An owner removes the current user from a workspace

The current user's `group_user` row is deleted. Their user durable object loses the workspace subscription and refetches the graph. The workspace disappears from the sidebar.

For files owned by that workspace:

- Private files lose the user's `file_state` through cleanup.
- Shared files may remain accessible through shared-link rules.
- If the user is connected to a private file, the file durable object closes the session with forbidden.
- If the user is connected to a shared edit file, they can remain connected as a guest.
- If the user is connected to a shared view file, they can remain or reconnect as read-only.

Again, membership removal and shared-link access are separate. Removing someone from a workspace does not automatically make every shared file private.

### The current user leaves a workspace

The local settings flow deletes the user's membership and navigates to root. The last owner cannot leave.

If another tab or device is open in a file from that workspace, it receives the same membership loss through sync. Private active files lose access; shared active files may continue as guest sessions.

### An owner deletes a workspace

All members lose the workspace. Files owned by the workspace are marked deleted and connected sessions close with not found.

Files merely linked into the workspace are not owned by it, but the workspace's links are removed when the workspace is deleted.

### An owner changes the current user's role

If the user is promoted to owner, owner-only workspace settings become available after sync.

If the user is demoted to member, they keep file access, file editing, file moving, file removal, and invite management. They lose non-home workspace rename, member management, and workspace deletion.

Open files are unaffected because both roles include `accessFiles`.

### A member regenerates the invite link

The workspace's `inviteSecret` changes. Existing invite links stop resolving. Users who open an old link see the expired invite path. Current members stay in the workspace.

Because members have `manageInvites`, this is not owner-only.

### A member unshares a file while guests have it open

Non-member guests lose access when the file becomes private. Cleanup removes guest file states and home workspace links, while owning workspace members keep access.

Connected guest sessions close with forbidden. Workspace members stay connected.

### A member changes a shared file from edit to view

Workspace members keep edit access because their access comes from membership. Non-member guests reconnect so the room can reopen in read-only mode.

### A user imports `.tldr` files while viewing a workspace

The result depends on the import path:

- Dropping a `.tldr` file on the canvas uses the current file's owning workspace.
- Dropping a `.tldr` file on the sidebar uses the default creation path and creates in home.
- Importing from the main menu also creates in home.

This can surprise users because the sidebar new-file button respects the active workspace, but sidebar import does not.

## Current risk areas and open questions

### Moving files does not change shared-link access

New workspace files are shared edit by default. Moving a file to another workspace keeps that sharing state. A user who loses workspace membership access because of a move can still edit as a shared-link guest unless the file is made private or view-only.

This may be correct, but it is not obvious from the workspace mental model. Users may expect "move to another workspace" to transfer both ownership and access.

### Members have broad file powers

Members can remove files, move files, and manage invite links. They also get file-level admin UI because `useHasFileAdminRights` maps to `accessFiles`.

If the product expectation is "member can collaborate but not administer files," the current capability model does not express that distinction.

### The delete versus forget language can be misleading

For workspace-owned files, any member is treated as having file admin rights and sees "Delete." That action deletes the file for everyone.

For linked files, removal is closer to "remove from this workspace" or "forget," because the underlying file remains.

The UI text is based on the user's file admin rights, not directly on whether the current workspace owns the file.

### Active workspace fallback can hide why context changed

When an open file is moved to a workspace the user does not belong to, or when the user loses membership, the active workspace can fall back to home while the canvas continues as a guest shared-link session.

The user may experience this as the workspace switcher changing unexpectedly, without an explicit explanation that the file moved or their workspace access changed.

### Shared files can survive membership removal

Removing a user from a workspace deletes private file states for files owned by that workspace, but shared files can remain accessible through shared-link rules. If the expected action is "remove this person from all workspace content," the owner must also make files private or change link access.

### Import paths are not workspace-consistent

New file creation in the sidebar uses the active workspace, but sidebar and main-menu `.tldr` imports create in home. Canvas drops use the current file's owning workspace.

### File menu behavior differs by source

The file header menu passes no workspace id, so it can show move actions but not pin or delete. Sidebar file menus pass a workspace id and show pin and delete/remove actions.

This is logical in the current code, but it is another source of inconsistent file action availability.

### Test coverage is mostly single-user

The current workspace e2e smoke tests cover creating workspaces, creating files in the active workspace, moving files, pinning, deleting the active file locally, and basic invite flows.

The higher-risk multiplayer scenarios do not appear to be covered yet:

- Another user moves the active file to a workspace the viewer is not in.
- Another user removes the viewer from a workspace while they have a file open.
- Another user deletes the active workspace.
- Another user deletes the active file.
- A shared workspace file is made private while guests have it open.
- Sidebar `.tldr` import behavior in non-home workspaces.

## Source map

Main files reviewed:

- `packages/dotcom-shared/src/tlaSchema.ts`
- `packages/dotcom-shared/src/capabilities.ts`
- `packages/dotcom-shared/src/roles.ts`
- `packages/dotcom-shared/src/mutators.ts`
- `packages/dotcom-shared/src/mutators.test.ts`
- `apps/dotcom/client/src/tla/app/TldrawApp.ts`
- `apps/dotcom/client/src/tla/hooks/useActiveWorkspaceId.ts`
- `apps/dotcom/client/src/tla/hooks/useIsFileOwner.tsx`
- `apps/dotcom/client/src/tla/components/TlaSidebar/components/TlaSidebarWorkspaceSwitcher.tsx`
- `apps/dotcom/client/src/tla/components/TlaSidebar/components/TlaSidebarRecentFilesNew.tsx`
- `apps/dotcom/client/src/tla/components/TlaFileMenu/TlaFileMenu.tsx`
- `apps/dotcom/client/src/tla/components/dialogs/WorkspaceSettingsDialog.tsx`
- `apps/dotcom/client/src/tla/components/dialogs/TlaDeleteFileDialog.tsx`
- `apps/dotcom/client/src/tla/components/WorkspaceInviteHandler.tsx`
- `apps/dotcom/client/src/tla/hooks/useTldrFileDrop.ts`
- `apps/dotcom/client/src/tla/components/TlaEditor/sneaky/SneakyFileDropHandler.tsx`
- `apps/dotcom/sync-worker/src/TLFileDurableObject.ts`
- `apps/dotcom/sync-worker/src/UserDataSyncer.ts`
- `apps/dotcom/sync-worker/src/fetchEverythingSql.snap.ts`
- `apps/dotcom/sync-worker/src/routes/tla/acceptInvite.ts`
- `apps/dotcom/sync-worker/src/routes/tla/getInviteInfo.ts`
- `apps/dotcom/sync-worker/src/utils/tla/getJoinableWorkspaceFromInvite.ts`
- `apps/dotcom/zero-cache/migrations/023_groups.sql`
- `apps/dotcom/zero-cache/migrations/034_fix_unshare_group_file_cleanup.sql`
- `apps/dotcom/client/e2e/tests/smoke/workspaces.spec.ts`
