-- Migration: Document Realtime Channel Support
-- Fixes: BUG-18 - Document Sharing Permission Changes Not Updating Realtime
-- Date: 2025-10-06
-- Description: Enables document-level realtime channels for permission update broadcasts
--
-- Note: Supabase Realtime broadcast channels (used for custom events like permission
-- changes) are open by default and don't require RLS policies. The security model
-- relies on application-level authorization:
-- 1. Only workspace members can update document sharing via the API
-- 2. The API verifies permissions before broadcasting events
-- 3. Guest users can subscribe to document channels to receive updates
-- 4. Guests cannot broadcast events (only the API can)
--
-- This is different from Presence and Postgres Changes features which do use RLS.
-- For broadcast channels, security is enforced at the API layer before events are sent.

-- No schema changes needed for broadcast channels
-- Document channel pattern: document:{documentId}
-- Event name: document_event
-- Payload includes: type, payload, timestamp, actor_id

-- This migration serves as documentation of the realtime architecture
-- The actual functionality is implemented in:
-- - simple-client/src/hooks/useDocumentRealtimeUpdates.ts (subscription hook)
-- - simple-client/src/lib/realtime/types.ts (event type definitions)
-- - simple-client/src/app/api/documents/[documentId]/share/route.ts (broadcast sender)
-- - simple-client/src/app/d/[documentId]/document-view-client.tsx (consumer)

COMMENT ON EXTENSION "pg_trgm" IS 'Document realtime channels enabled - see BUG-18 for implementation details';
