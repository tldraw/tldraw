# Task for simple-dotcom-engineer

## Implement DOC-05: Archive and Hard Delete Policies

### Task Description
Implement backend policies for workspace-specific document archives, including hard delete operations guarded by permissions and confirmation patterns.

### Current State Analysis
- The database already has `is_archived` and `archived_at` columns on the documents table
- Basic soft delete (archive) is implemented in the DELETE endpoint at `/api/documents/[documentId]/route.ts`
- Archive functionality sets `is_archived=true` and `archived_at` timestamp
- No dedicated `/archive` endpoint exists yet
- No hard delete endpoint exists
- No audit logging for archive/delete operations

### Requirements to Implement

#### 1. Add Dedicated Archive Endpoint
Create `/api/documents/[documentId]/archive/route.ts`:
- POST endpoint to archive a document (soft delete)
- Should check user is workspace member
- Set `is_archived=true` and `archived_at` timestamp
- Return success response

#### 2. Add Hard Delete Endpoint
Create `/api/documents/[documentId]/delete/route.ts`:
- DELETE endpoint to permanently remove document
- **Restricted to workspace owners only** (not just members)
- Should verify user is workspace owner before allowing
- Permanently delete from database
- Trigger R2 storage cleanup if `r2_key` exists (add TODO comment if R2 not implemented yet)
- Add confirmation token validation for safety (use request header like X-Confirm-Delete: true)

#### 3. Add Audit Logging
Create a database migration to add audit_logs table:
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  document_id UUID, -- nullable since document may be deleted
  action TEXT NOT NULL, -- 'document_archived', 'document_hard_deleted'
  metadata JSONB, -- additional context
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
- Insert audit log entries when archive/delete operations occur

#### 4. Update API Types
In `/lib/api/types.ts`:
- Add AuditLog type
- Add any other types needed

#### 5. Database Migration
Create a new migration file:
- Add audit_logs table (see SQL above)
- Optionally add `deleted_at` column to documents table for tracking hard deletes
- Add indexes on audit_logs for querying by workspace_id and user_id

#### 6. Update Existing Endpoints
- Keep the current DELETE endpoint at `/api/documents/[documentId]/route.ts` as-is for backwards compatibility
- It already does soft delete (archive) which is fine

### Acceptance Criteria
- [ ] API endpoints enforce `is_archived` flag to segment archived documents
- [ ] Hard delete endpoint permanently removes document records
- [ ] Hard delete restricted to workspace owners only
- [ ] Audit logs capture archive and hard delete actions
- [ ] Confirmation header required for hard deletes
- [ ] Foreign key cascades handle deletion of associated data safely

### Technical Implementation Notes

1. For the archive endpoint, follow the pattern in the existing DELETE endpoint
2. For hard delete, use this pattern to check ownership:
```typescript
const { data: membership } = await supabase
  .from('workspace_members')
  .select('role')
  .eq('workspace_id', document.workspace_id)
  .eq('user_id', user.id)
  .single()

if (!membership || membership.role !== 'owner') {
  throw new ApiException(403, ErrorCodes.FORBIDDEN, 'Only workspace owners can permanently delete documents')
}
```

3. For audit logging:
```typescript
await supabase.from('audit_logs').insert({
  user_id: user.id,
  workspace_id: document.workspace_id,
  document_id: documentId,
  action: 'document_hard_deleted',
  metadata: { document_name: document.name }
})
```

4. For R2 cleanup, add a TODO comment:
```typescript
// TODO: Implement R2 storage cleanup when TECH-02 is complete
// if (document.r2_key) {
//   await deleteFromR2(document.r2_key)
// }
```

### Files to Create/Modify
1. Create: `simple-client/src/app/api/documents/[documentId]/archive/route.ts`
2. Create: `simple-client/src/app/api/documents/[documentId]/delete/route.ts`
3. Create migration: `supabase/migrations/[timestamp]_add_audit_logs.sql`
4. Modify: `simple-client/src/lib/api/types.ts` - add AuditLog type
5. After migration, regenerate types: `cd simple-client && yarn gen-types`

### Testing
After implementation:
1. Test archive endpoint works for workspace members
2. Test hard delete works only for workspace owners
3. Test that audit logs are created
4. Verify that cascading deletes work (presence, document_access_log entries deleted)
5. Test confirmation header is required for hard delete

Please implement this following the existing patterns in the codebase. Make sure to handle errors properly using ApiException and the existing error codes pattern.