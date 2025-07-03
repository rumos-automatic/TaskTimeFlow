-- Add settings column to profiles table for storing user preferences
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN profiles.settings IS 'User preferences including UI settings, sort orders, etc.';