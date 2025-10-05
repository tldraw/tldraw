# Task for simple-dotcom-engineer

## Implement MEM-05: Member Limit Guardrails

### Task Description
Introduce sanity checks to enforce the ~100 member per workspace limit, preventing overages and surfacing warnings as the limit is approached.

### Current State Analysis
- Workspace member management exists with roles (owner/member)
- No current limits on number of members per workspace
- Member invitation and addition endpoints exist
- No warning system for approaching limits

### Requirements to Implement

#### 1. Add Member Limit Configuration
Create a configuration constant for the member limit:
```typescript
// In simple-client/src/lib/constants.ts (create if doesn't exist)
export const WORKSPACE_LIMITS = {
  MAX_MEMBERS: 100,
  WARNING_THRESHOLD: 90, // Show warning at 90% capacity
} as const
```

#### 2. Update Member Addition Endpoints
Modify these endpoints to check member count before adding:
- `/api/workspaces/[workspaceId]/members/route.ts` - direct member addition
- `/api/invitations/accept/route.ts` - invitation acceptance (if it adds members)

For each endpoint:
```typescript
// Check current member count
const { count } = await supabase
  .from('workspace_members')
  .select('*', { count: 'exact', head: true })
  .eq('workspace_id', workspaceId)

if (count >= WORKSPACE_LIMITS.MAX_MEMBERS) {
  throw new ApiException(
    403,
    ErrorCodes.MEMBER_LIMIT_EXCEEDED,
    `Workspace has reached the maximum limit of ${WORKSPACE_LIMITS.MAX_MEMBERS} members`
  )
}

// If near limit, include warning in response
const warning = count >= WORKSPACE_LIMITS.WARNING_THRESHOLD
  ? `Workspace is approaching member limit (${count}/${WORKSPACE_LIMITS.MAX_MEMBERS})`
  : undefined
```

#### 3. Add Error Code
In `/lib/api/errors.ts`, add:
```typescript
MEMBER_LIMIT_EXCEEDED = 'MEMBER_LIMIT_EXCEEDED',
```

#### 4. Create Database Function for Efficient Counting
Create a migration to add a function for checking member limits:
```sql
-- Function to check if workspace can add more members
CREATE OR REPLACE FUNCTION check_workspace_member_limit(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  member_count INTEGER;
  max_limit INTEGER := 100;
BEGIN
  SELECT COUNT(*) INTO member_count
  FROM workspace_members
  WHERE workspace_id = workspace_uuid;

  RETURN member_count < max_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION check_workspace_member_limit IS 'Checks if workspace has room for more members (limit: 100)';
```

#### 5. Update UI Components
In workspace member management components, add:
- Member count display: "Members (X/100)"
- Warning banner when count >= 90
- Error message when trying to add members at limit

Look for these components:
- `WorkspaceSettings` or similar component
- Member invitation modal/form
- Member list component

Add warning banner component:
```tsx
{memberCount >= WORKSPACE_LIMITS.WARNING_THRESHOLD && (
  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4">
    <strong>Approaching member limit:</strong> This workspace has {memberCount} of {WORKSPACE_LIMITS.MAX_MEMBERS} members.
    Consider removing inactive members before the limit is reached.
  </div>
)}
```

#### 6. Add Observability/Logging
When limit blocks occur, log to audit_logs:
```typescript
if (count >= WORKSPACE_LIMITS.MAX_MEMBERS) {
  // Log the blocked attempt
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    workspace_id: workspaceId,
    action: 'member_limit_exceeded',
    metadata: {
      attempted_action: 'add_member',
      current_count: count,
      limit: WORKSPACE_LIMITS.MAX_MEMBERS
    }
  })

  throw new ApiException(...)
}
```

### Acceptance Criteria
- [ ] Member invite and add endpoints validate workspace membership count before inserting
- [ ] Endpoints block additions beyond 100 member limit with descriptive error messages
- [ ] UI surfaces friendly warning when member count crosses 90 members
- [ ] Observability captures when limit blocks are hit via audit logs

### Files to Create/Modify
1. Create: `simple-client/src/lib/constants.ts` - add workspace limits
2. Modify: `/api/workspaces/[workspaceId]/members/route.ts` - add limit check
3. Modify: Any invitation acceptance endpoint - add limit check
4. Modify: `/lib/api/errors.ts` - add new error code
5. Create migration: Add check_workspace_member_limit function
6. Modify: Workspace settings/member UI components - add count and warnings
7. After migration, regenerate types: `cd simple-client && yarn gen-types`

### Testing
1. Create workspace with 99 members (use loop in test)
2. Try to add 100th member - should succeed with warning
3. Try to add 101st member - should fail with error
4. Verify warning appears in UI at 90+ members
5. Check audit logs capture limit exceeded attempts

### Implementation Notes
- Make the limit configurable via constants for easy future adjustment
- Consider future plan-based differentiation (e.g., free=10, pro=100, enterprise=unlimited)
- Ensure RLS policies also enforce limits if direct Supabase access is possible
- Use database function for atomic count checking if needed

Please implement this following the existing patterns in the codebase.