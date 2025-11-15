-- Update Storage Policies for Service Role Access
-- This migration updates the storage policies to work with the service role key
-- while maintaining security by checking the folder structure

-- Drop existing policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;

-- Create new policies that work with service role key
-- These policies check the folder structure instead of auth.uid()

-- Public Read Access Policy
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'profile-avatars');

-- Service Role Upload Policy
-- Allow uploads to user-specific folders (folder name must be a valid UUID)
CREATE POLICY "Service can upload avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'profile-avatars' 
  AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);

-- Service Role Update Policy
CREATE POLICY "Service can update avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'profile-avatars' 
  AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);

-- Service Role Delete Policy
CREATE POLICY "Service can delete avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'profile-avatars' 
  AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);
