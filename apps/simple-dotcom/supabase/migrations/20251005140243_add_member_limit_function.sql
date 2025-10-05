-- Add function for checking workspace member limits
-- Part of MEM-05: Member Limit Guardrails

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

-- Function to get current member count for a workspace
CREATE OR REPLACE FUNCTION get_workspace_member_count(workspace_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  member_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO member_count
  FROM workspace_members
  WHERE workspace_id = workspace_uuid;

  RETURN member_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON FUNCTION check_workspace_member_limit IS 'Checks if workspace has room for more members (limit: 100)';
COMMENT ON FUNCTION get_workspace_member_count IS 'Returns the current member count for a workspace';