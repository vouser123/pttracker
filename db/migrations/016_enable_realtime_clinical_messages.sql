-- Enable Supabase Realtime for clinical_messages table.
-- Required for useMessages hook to receive live push notifications
-- instead of polling /api/logs?type=messages every 30 seconds.
alter publication supabase_realtime add table clinical_messages;
