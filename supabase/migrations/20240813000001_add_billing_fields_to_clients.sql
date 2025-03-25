-- Add billing fields to clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS billing_name text;

-- Enable realtime for clients table
alter publication supabase_realtime add table clients;
