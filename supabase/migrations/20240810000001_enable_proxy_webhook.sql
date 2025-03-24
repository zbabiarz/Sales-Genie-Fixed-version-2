-- Enable the proxy-webhook edge function

-- First, ensure the function exists in the database
INSERT INTO storage.buckets (id, name)
VALUES ('functions', 'functions')
ON CONFLICT (id) DO NOTHING;

-- Grant necessary permissions for the function
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Enable the function to make external HTTP requests
UPDATE auth.hooks
SET hook_function_version = 'proxy-webhook'
WHERE hook_name = 'HTTP_REQUEST_PROXY';

-- Add the function to realtime publication if needed
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS storage.objects;
