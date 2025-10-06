-- Migration: Enable Real-time Replication for Core Tables
-- Fixes: BUG-26 - Document Creation Not Updating Sidebar in Real-time
-- Date: 2025-10-06
-- Description: Enables real-time replication for documents, workspaces, workspace_members, and folders tables
-- so that the dashboard sidebar updates immediately when documents are created/updated/deleted.

-- Enable REPLICA IDENTITY FULL for all tables that need real-time updates
-- This ensures the full row is sent in change notifications

-- Documents table - primary fix for BUG-26
ALTER TABLE public.documents REPLICA IDENTITY FULL;

-- Workspaces table - for workspace creation/updates
ALTER TABLE public.workspaces REPLICA IDENTITY FULL;

-- Workspace members table - for member changes
ALTER TABLE public.workspace_members REPLICA IDENTITY FULL;

-- Folders table - for folder operations
ALTER TABLE public.folders REPLICA IDENTITY FULL;

-- Add all tables to the supabase_realtime publication
-- This makes them available for real-time subscriptions via the Supabase client

ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspaces;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.folders;
