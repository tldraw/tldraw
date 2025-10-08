-- Enable Realtime replication for the presence table
-- This allows postgres_changes subscriptions to receive INSERT/UPDATE/DELETE events

ALTER PUBLICATION supabase_realtime ADD TABLE presence;

-- Verify the table is now replicated
-- You can check with: SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
