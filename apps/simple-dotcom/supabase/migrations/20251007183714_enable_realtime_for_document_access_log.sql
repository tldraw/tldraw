-- Migration: Enable Real-time Replication for document_access_log
-- Fixes: BUG-21 - Recent Documents List Not Reactive
-- Date: 2025-10-07
-- Description: Enables real-time replication for document_access_log table
-- so that the dashboard recent documents list updates immediately when documents are accessed.

-- Enable REPLICA IDENTITY FULL for document_access_log table
-- This ensures the full row is sent in change notifications
ALTER TABLE public.document_access_log REPLICA IDENTITY FULL;

-- Add document_access_log table to the supabase_realtime publication
-- This makes it available for real-time subscriptions via the Supabase client
ALTER PUBLICATION supabase_realtime ADD TABLE public.document_access_log;
