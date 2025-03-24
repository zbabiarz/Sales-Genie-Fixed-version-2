-- Add openai_thread_id column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS openai_thread_id TEXT;
