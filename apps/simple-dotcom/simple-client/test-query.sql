-- Test query to see if owner appears in workspace_members results
SELECT 
    wm.user_id,
    wm.role,
    u.id,
    u.email,
    u.display_name
FROM workspace_members wm
INNER JOIN users u ON wm.user_id = u.id
WHERE wm.workspace_id = 'some-workspace-id'
  AND wm.user_id != 'owner-user-id';
