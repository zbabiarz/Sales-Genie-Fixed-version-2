-- Add indexes to chat_messages table for better performance
CREATE INDEX IF NOT EXISTS chat_messages_user_id_idx ON chat_messages (user_id);
CREATE INDEX IF NOT EXISTS chat_messages_thread_id_idx ON chat_messages (thread_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages (created_at);

-- Add realtime support for chat_messages
alter publication supabase_realtime add table chat_messages;