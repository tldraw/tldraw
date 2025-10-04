# RLS Policies Outline for PERM-01

This document outlines the Row Level Security (RLS) policies required for the Simple tldraw MVP. These policies will be implemented in ticket PERM-01 and use the helper functions already defined in the base schema migration.

## Helper Functions (Already Implemented)

The following helper functions are available in the schema:
- `is_workspace_owner(workspace_uuid, user_uuid)` - Returns true if user owns workspace
- `is_workspace_member(workspace_uuid, user_uuid)` - Returns true if user is member or owner
- `can_access_document(document_uuid, user_uuid)` - Returns true if user can read document
- `can_edit_document(document_uuid, user_uuid)` - Returns true if user can edit document

## Policy Strategy

All tables will have RLS enabled. Policies follow defense-in-depth principles:
1. Authenticated users can only access their own data or data in workspaces they belong to
2. Public document access is granted based on sharing_mode
3. Guest access is limited to document operations only (no workspace chrome)
4. Service role bypasses RLS for server-side operations

## Table-by-Table Policy Definitions

### `users` Table

**Enable RLS:**
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

**Policies:**
- `users_select_own` - Users can read their own profile
  - Operation: SELECT
  - Predicate: `auth.uid() = id`

- `users_update_own` - Users can update their own profile
  - Operation: UPDATE
  - Predicate: `auth.uid() = id`

- `users_select_workspace_members` - Users can see profiles of people in their workspaces
  - Operation: SELECT
  - Predicate: `EXISTS (SELECT 1 FROM workspace_members wm1 JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id WHERE wm1.user_id = auth.uid() AND wm2.user_id = users.id)`

### `workspaces` Table

**Enable RLS:**
```sql
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
```

**Policies:**
- `workspaces_select_member` - Members can view their workspaces
  - Operation: SELECT
  - Predicate: `is_workspace_member(id, auth.uid())`

- `workspaces_insert_owner` - Authenticated users can create workspaces
  - Operation: INSERT
  - Predicate: `auth.uid() = owner_id`

- `workspaces_update_owner` - Owners can update their workspaces
  - Operation: UPDATE
  - Predicate: `is_workspace_owner(id, auth.uid())`

- `workspaces_delete_owner` - Owners can soft delete their workspaces
  - Operation: UPDATE (soft delete via is_deleted flag)
  - Predicate: `is_workspace_owner(id, auth.uid())`

### `workspace_members` Table

**Enable RLS:**
```sql
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
```

**Policies:**
- `workspace_members_select_member` - Members can view membership of their workspaces
  - Operation: SELECT
  - Predicate: `is_workspace_member(workspace_id, auth.uid())`

- `workspace_members_insert_owner` - Owners can add members (via invite flow)
  - Operation: INSERT
  - Predicate: `is_workspace_owner(workspace_id, auth.uid()) OR user_id = auth.uid()` (allows self-join via invite)

- `workspace_members_delete_owner` - Owners can remove members
  - Operation: DELETE
  - Predicate: `is_workspace_owner(workspace_id, auth.uid())`

- `workspace_members_delete_self` - Members can leave workspaces
  - Operation: DELETE
  - Predicate: `user_id = auth.uid() AND NOT is_workspace_owner(workspace_id, auth.uid())`

### `invitation_links` Table

**Enable RLS:**
```sql
ALTER TABLE invitation_links ENABLE ROW LEVEL SECURITY;
```

**Policies:**
- `invitation_links_select_member` - Members can view their workspace invites
  - Operation: SELECT
  - Predicate: `is_workspace_member(workspace_id, auth.uid())`

- `invitation_links_select_by_token` - Anyone can read invite by token (for join flow)
  - Operation: SELECT
  - Predicate: `true` (public read with token)

- `invitation_links_insert_owner` - Owners can create invitation links
  - Operation: INSERT
  - Predicate: `is_workspace_owner(workspace_id, auth.uid())`

- `invitation_links_update_owner` - Owners can enable/disable/regenerate
  - Operation: UPDATE
  - Predicate: `is_workspace_owner(workspace_id, auth.uid())`

### `folders` Table

**Enable RLS:**
```sql
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
```

**Policies:**
- `folders_select_member` - Members can view folders in their workspaces
  - Operation: SELECT
  - Predicate: `is_workspace_member(workspace_id, auth.uid())`

- `folders_insert_member` - Members can create folders
  - Operation: INSERT
  - Predicate: `is_workspace_member(workspace_id, auth.uid())`

- `folders_update_member` - Members can update folders in their workspaces
  - Operation: UPDATE
  - Predicate: `is_workspace_member(workspace_id, auth.uid())`

- `folders_delete_member` - Members can delete folders
  - Operation: DELETE
  - Predicate: `is_workspace_member(workspace_id, auth.uid())`

### `documents` Table

**Enable RLS:**
```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
```

**Policies:**
- `documents_select_member` - Members can view workspace documents
  - Operation: SELECT
  - Predicate: `is_workspace_member(workspace_id, auth.uid())`

- `documents_select_public` - Anyone can view public documents
  - Operation: SELECT
  - Predicate: `sharing_mode IN ('public_read_only', 'public_editable')`

- `documents_insert_member` - Members can create documents
  - Operation: INSERT
  - Predicate: `is_workspace_member(workspace_id, auth.uid())`

- `documents_update_member` - Members can update workspace documents
  - Operation: UPDATE
  - Predicate: `is_workspace_member(workspace_id, auth.uid())`

- `documents_update_public_editable` - Anyone can update public editable documents
  - Operation: UPDATE
  - Predicate: `sharing_mode = 'public_editable'`

- `documents_delete_member` - Members can delete/archive documents
  - Operation: DELETE
  - Predicate: `is_workspace_member(workspace_id, auth.uid())`

### `document_access_log` Table

**Enable RLS:**
```sql
ALTER TABLE document_access_log ENABLE ROW LEVEL SECURITY;
```

**Policies:**
- `document_access_log_select_own` - Users can view their own access history
  - Operation: SELECT
  - Predicate: `user_id = auth.uid()`

- `document_access_log_insert_own` - Users can log their own document access
  - Operation: INSERT
  - Predicate: `user_id = auth.uid() AND can_access_document(document_id, auth.uid())`

### `presence` Table

**Enable RLS:**
```sql
ALTER TABLE presence ENABLE ROW LEVEL SECURITY;
```

**Policies:**
- `presence_select_document_access` - Users with document access can view presence
  - Operation: SELECT
  - Predicate: `can_access_document(document_id, auth.uid())`

- `presence_insert_document_access` - Users with document access can create presence
  - Operation: INSERT
  - Predicate: `can_access_document(document_id, auth.uid()) AND (user_id = auth.uid() OR user_id IS NULL)`

- `presence_update_own` - Users can update their own presence
  - Operation: UPDATE
  - Predicate: `user_id = auth.uid() OR (user_id IS NULL AND can_access_document(document_id, auth.uid()))`

- `presence_delete_own` - Users can delete their own presence
  - Operation: DELETE
  - Predicate: `user_id = auth.uid() OR (user_id IS NULL AND can_access_document(document_id, auth.uid()))`

## Implementation Notes for PERM-01

1. **Enable RLS on all tables** - Use `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
2. **Create policies in order** - Start with users, then workspaces, then dependent tables
3. **Test each policy** - Verify access works correctly for owners, members, guests, and unauthenticated users
4. **Service role access** - Ensure server-side operations use service role key to bypass RLS
5. **Performance** - Monitor query performance and add indexes if needed for policy predicates

## Security Considerations

- **Guest access isolation** - Guests can only access documents, not workspace data
- **Private workspace enforcement** - Private workspaces (AUTH-02) must remain isolated
- **Soft delete visibility** - Ensure `is_deleted` and `is_archived` flags are respected
- **Token security** - Invitation link tokens should be validated before granting access
- **Audit trail** - Consider adding audit logging for sensitive operations (ownership transfer, member removal)

## Testing Checklist for PERM-01

- [ ] Owner can CRUD their workspace
- [ ] Member can view workspace but not modify settings
- [ ] Non-member cannot access workspace
- [ ] Owner can add/remove members
- [ ] Member can leave workspace (non-owner only)
- [ ] Guest can access public read-only document (read only)
- [ ] Guest can edit public editable document
- [ ] Guest cannot access private documents
- [ ] Guest cannot access workspace chrome
- [ ] Invitation link validation works correctly
- [ ] Folder access respects workspace membership
- [ ] Document access respects sharing modes
- [ ] Presence works for both members and guests
- [ ] Service role can perform all operations
