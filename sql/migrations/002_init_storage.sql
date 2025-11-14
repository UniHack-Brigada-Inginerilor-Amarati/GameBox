-- Supabase Storage Setup for Profile Avatars
-- This migration creates the storage bucket and policies for user avatar management

-- Step 1: Create Storage Bucket
-- Note: Bucket creation is typically done through the Supabase dashboard
-- The bucket 'profile-avatars' should be created manually as a public bucket

-- Step 2: Configure Bucket Policies

-- Public Read Access Policy
-- Allow public read access to all files in the bucket
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'profile-avatars');

-- Authenticated User Upload Policy
-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'profile-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- User Update Policy
-- Allow users to update their own avatars
CREATE POLICY "Users can update own avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'profile-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- User Delete Policy
-- Allow users to delete their own avatars
CREATE POLICY "Users can delete own avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'profile-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Step 3: Update user_profiles table

-- Add new columns for avatar storage
ALTER TABLE gamebox.user_profiles 
ADD COLUMN IF NOT EXISTS avatar_storage_path text;

-- Add index on storage path for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_avatar_storage_path 
ON gamebox.user_profiles(avatar_storage_path);

-- Add comment to document the new fields
COMMENT ON COLUMN gamebox.user_profiles.avatar_storage_path IS 'Path to avatar file in storage bucket';

-- Note: The existing RLS policies should work with the new fields since they're based on user ID
