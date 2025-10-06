-- M15-03: Atomic Workspace Ownership Transfer
-- Created: 2025-10-05
-- Implements atomic ownership transfer to prevent partial updates
--
-- This migration creates a database function that performs all ownership
-- transfer operations within a single transaction, ensuring consistency.

SET search_path TO public;

-- ============================================================================
-- FUNCTION: Atomic workspace ownership transfer
-- ============================================================================

-- Function to atomically transfer workspace ownership
-- This ensures all updates happen together or none at all
CREATE OR REPLACE FUNCTION public.transfer_workspace_ownership(
  p_workspace_id UUID,
  p_current_owner_id UUID,
  p_new_owner_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace RECORD;
  v_new_owner_member RECORD;
BEGIN
  -- Validate workspace exists and current user is owner
  SELECT * INTO v_workspace
  FROM workspaces
  WHERE id = p_workspace_id
    AND owner_id = p_current_owner_id
    AND is_deleted = false
  FOR UPDATE;  -- Lock the row for the duration of the transaction

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Workspace not found or you are not the owner',
      'code', 'WORKSPACE_NOT_FOUND'
    );
  END IF;

  -- Check if workspace is private (cannot transfer private workspaces)
  IF v_workspace.is_private THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot transfer ownership of private workspace',
      'code', 'CANNOT_TRANSFER_PRIVATE'
    );
  END IF;

  -- Validate new owner is a member
  SELECT * INTO v_new_owner_member
  FROM workspace_members
  WHERE workspace_id = p_workspace_id
    AND user_id = p_new_owner_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'New owner must be an existing workspace member',
      'code', 'INVALID_NEW_OWNER'
    );
  END IF;

  -- Prevent self-transfer
  IF p_current_owner_id = p_new_owner_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot transfer ownership to yourself',
      'code', 'SELF_TRANSFER'
    );
  END IF;

  -- Perform atomic transfer (all operations or none)
  -- 1. Update workspace owner
  UPDATE workspaces
  SET
    owner_id = p_new_owner_id,
    updated_at = NOW()
  WHERE id = p_workspace_id;

  -- 2. Update new owner role to 'owner'
  UPDATE workspace_members
  SET
    role = 'owner'
  WHERE workspace_id = p_workspace_id
    AND user_id = p_new_owner_id;

  -- 3. Update old owner role to 'member'
  -- First check if old owner exists in workspace_members
  IF EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = p_current_owner_id
  ) THEN
    UPDATE workspace_members
    SET
      role = 'member'
    WHERE workspace_id = p_workspace_id
      AND user_id = p_current_owner_id;
  ELSE
    -- Add old owner as member if not exists (edge case)
    INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
    VALUES (p_workspace_id, p_current_owner_id, 'member', NOW());
  END IF;

  -- Optional: Add audit log entry (uncomment when audit table is created)
  -- INSERT INTO workspace_audit_logs (
  --   workspace_id,
  --   action,
  --   actor_id,
  --   target_id,
  --   metadata,
  --   created_at
  -- )
  -- VALUES (
  --   p_workspace_id,
  --   'ownership_transferred',
  --   p_current_owner_id,
  --   p_new_owner_id,
  --   json_build_object(
  --     'previous_owner_id', p_current_owner_id,
  --     'new_owner_id', p_new_owner_id,
  --     'timestamp', NOW()
  --   ),
  --   NOW()
  -- );

  RETURN json_build_object(
    'success', true,
    'message', 'Ownership transferred successfully',
    'data', json_build_object(
      'workspace_id', p_workspace_id,
      'previous_owner_id', p_current_owner_id,
      'new_owner_id', p_new_owner_id
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Transaction automatically rolls back on exception
    RETURN json_build_object(
      'success', false,
      'error', 'Transfer failed: ' || SQLERRM,
      'code', 'TRANSFER_FAILED'
    );
END;
$$;

-- Grant execute permission to authenticated users
-- RLS policies on workspaces table will handle authorization
GRANT EXECUTE ON FUNCTION public.transfer_workspace_ownership TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.transfer_workspace_ownership IS
'Atomically transfers workspace ownership from current owner to a new member.
All operations are performed in a single transaction to prevent partial updates.
Returns JSON with success status and either data or error details.';