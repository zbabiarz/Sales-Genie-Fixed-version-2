-- Fix users table structure to properly use auth UID
-- Remove redundant user_id field and ensure id is the primary key referencing auth.users(id)

-- First, update any existing records to ensure consistency
UPDATE users SET user_id = id WHERE user_id != id OR user_id IS NULL;

-- Drop the redundant user_id column and its index
DROP INDEX IF EXISTS users_user_id_idx;
ALTER TABLE users DROP COLUMN IF EXISTS user_id;

-- Update the handle_new_auth_user function to only use the id field
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    name,
    full_name,
    email,
    token_identifier,
    created_at
  )
  VALUES (
    NEW.id,  -- Use the UID from auth.users directly
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.id,  -- Use the UID as token_identifier too
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    name = EXCLUDED.name,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created_users ON auth.users;
CREATE TRIGGER on_auth_user_created_users
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Update any code that references user_id to use id instead
-- Fix foreign key references in other tables
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_user_id_fkey;
ALTER TABLE clients ADD CONSTRAINT clients_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE call_recordings DROP CONSTRAINT IF EXISTS call_recordings_user_id_fkey;
ALTER TABLE call_recordings ADD CONSTRAINT call_recordings_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_user_id_fkey;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
