-- Create chat_messages table for storing conversation history locally
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  message_id TEXT
);

-- Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own messages
DROP POLICY IF EXISTS "Users can view their own messages";
CREATE POLICY "Users can view their own messages"
ON chat_messages FOR SELECT
USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own messages
DROP POLICY IF EXISTS "Users can insert their own messages";
CREATE POLICY "Users can insert their own messages"
ON chat_messages FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index on user_id and thread_id for faster queries
CREATE INDEX IF NOT EXISTS chat_messages_user_id_idx ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS chat_messages_thread_id_idx ON chat_messages(thread_id);
