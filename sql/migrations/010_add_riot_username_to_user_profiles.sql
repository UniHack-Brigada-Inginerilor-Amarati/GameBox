-- Migration: Add Riot Username to User Profiles
-- Description: Adds a riot_username field to the user_profiles table for storing Riot Games usernames

-- Add riot_username column to user_profiles table
ALTER TABLE gamebox.user_profiles
ADD COLUMN IF NOT EXISTS riot_username TEXT NULL;

-- Add a comment to document the field
COMMENT ON COLUMN gamebox.user_profiles.riot_username IS 'Riot Games username for the user';

-- The field is nullable, so no default value is needed
-- Users can optionally set their Riot username in their profile

