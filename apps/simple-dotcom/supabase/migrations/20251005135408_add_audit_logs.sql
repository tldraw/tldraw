-- Add audit logs table for tracking archive and delete operations
-- Part of DOC-05: Archive and Hard Delete Policies

-- Create audit_logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  document_id UUID, -- nullable since document may be deleted
  action TEXT NOT NULL, -- 'document_archived', 'document_hard_deleted', etc.
  metadata JSONB, -- additional context
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for efficient querying
CREATE INDEX idx_audit_logs_workspace_id ON audit_logs(workspace_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Add optional deleted_at column to documents for tracking hard deletes
ALTER TABLE documents ADD COLUMN deleted_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON TABLE audit_logs IS 'Audit trail for document and workspace operations';
COMMENT ON COLUMN audit_logs.action IS 'Action type: document_archived, document_hard_deleted, etc.';
COMMENT ON COLUMN audit_logs.metadata IS 'JSON object with additional context about the action';
COMMENT ON COLUMN documents.deleted_at IS 'Timestamp when document was permanently deleted (for soft-delete tracking before actual removal)';