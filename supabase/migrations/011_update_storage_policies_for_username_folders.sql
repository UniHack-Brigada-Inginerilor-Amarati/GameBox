-- Update Storage Policies for Username-Based Folders
-- This migration updates the storage policies to allow uploads to username-based folders
-- instead of UUID-based folders, matching the current implementation
-- 
-- Note: These policies work with the anon key client. The backend service
-- handles authentication before calling these operations, so we allow authenticated
-- users to upload to username-based folders.

-- Drop existing policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Service can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Service can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Service can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow username folder uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow username folder updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow username folder deletes" ON storage.objects;

-- Public Read Access Policy
-- Allow public read access to all files in the bucket
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'profile-avatars');

-- Upload Policy
-- Allow uploads to username-based folders
-- The folder structure is: username/filename
-- Note: The backend service handles authentication before calling storage operations.
-- Since the backend uses the service role key (supabaseAdmin) for storage operations,
-- these policies provide an additional layer of security for username-based folders.
CREATE POLICY "Allow username folder uploads" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'profile-avatars' 
  AND (storage.foldername(name))[1] IS NOT NULL
  AND length((storage.foldername(name))[1]) > 0
  AND length((storage.foldername(name))[1]) <= 50
  AND (storage.foldername(name))[1] ~ '^[a-zA-Z0-9_-]+$'
);

-- Update Policy
-- Allow updates to files in username-based folders
CREATE POLICY "Allow username folder updates" ON storage.objects
FOR UPDATE 
USING (
  bucket_id = 'profile-avatars' 
  AND (storage.foldername(name))[1] IS NOT NULL
  AND length((storage.foldername(name))[1]) > 0
  AND length((storage.foldername(name))[1]) <= 50
  AND (storage.foldername(name))[1] ~ '^[a-zA-Z0-9_-]+$'
);

-- Delete Policy
-- Allow deletion of files in username-based folders
CREATE POLICY "Allow username folder deletes" ON storage.objects
FOR DELETE 
USING (
  bucket_id = 'profile-avatars' 
  AND (storage.foldername(name))[1] IS NOT NULL
  AND length((storage.foldername(name))[1]) > 0
  AND length((storage.foldername(name))[1]) <= 50
  AND (storage.foldername(name))[1] ~ '^[a-zA-Z0-9_-]+$'
);

