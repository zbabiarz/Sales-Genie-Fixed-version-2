-- Add role column to users table with default value 'user'
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Update existing users to have 'user' role if role is null
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Add check constraint to ensure role is either 'user' or 'admin'
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));
