-- Create a table to store call recordings
CREATE TABLE IF NOT EXISTS call_recordings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  analysis_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS call_recordings_user_id_idx ON call_recordings(user_id);
CREATE INDEX IF NOT EXISTS call_recordings_status_idx ON call_recordings(status);

-- Enable RLS on the call_recordings table
ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;

-- Create policies for the call_recordings table
DROP POLICY IF EXISTS "Users can view their own recordings" ON call_recordings;
CREATE POLICY "Users can view their own recordings"
  ON call_recordings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own recordings" ON call_recordings;
CREATE POLICY "Users can insert their own recordings"
  ON call_recordings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own recordings" ON call_recordings;
CREATE POLICY "Users can update their own recordings"
  ON call_recordings FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable realtime for the call_recordings table
ALTER PUBLICATION supabase_realtime ADD TABLE call_recordings;

-- Create a storage bucket for call recordings if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('call_recordings', 'call_recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for the call_recordings bucket
DROP POLICY IF EXISTS "Users can upload their own recordings" ON storage.objects;
CREATE POLICY "Users can upload their own recordings"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'call_recordings' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Users can access their own recordings" ON storage.objects;
CREATE POLICY "Users can access their own recordings"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'call_recordings' AND auth.uid() = owner);
