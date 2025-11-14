-- Friends feature database schema
-- Run this in your Supabase SQL editor

-- Friend requests table
CREATE TABLE IF NOT EXISTS gamebox.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

-- Friends table (bidirectional relationships)
CREATE TABLE IF NOT EXISTS gamebox.friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_friend_requests_requester ON gamebox.friend_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_addressee ON gamebox.friend_requests(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON gamebox.friend_requests(status);
CREATE INDEX IF NOT EXISTS idx_friends_user ON gamebox.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend ON gamebox.friends(friend_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION gamebox.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_friend_requests_updated_at
  BEFORE UPDATE ON gamebox.friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION gamebox.update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE gamebox.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamebox.friends ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own friend requests (both sent and received)
CREATE POLICY "Users can view own friend requests"
  ON gamebox.friend_requests
  FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Policy: Users can create friend requests where they are the requester
CREATE POLICY "Users can create own friend requests"
  ON gamebox.friend_requests
  FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- Policy: Users can update friend requests where they are the addressee (to accept/reject)
CREATE POLICY "Users can update received friend requests"
  ON gamebox.friend_requests
  FOR UPDATE
  USING (auth.uid() = addressee_id)
  WITH CHECK (auth.uid() = addressee_id);

-- Policy: Users can delete their own sent friend requests
CREATE POLICY "Users can delete own sent friend requests"
  ON gamebox.friend_requests
  FOR DELETE
  USING (auth.uid() = requester_id);

-- Policy: Users can view their own friends
CREATE POLICY "Users can view own friends"
  ON gamebox.friends
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can add friends (when friend request is accepted, backend handles this)
CREATE POLICY "Users can insert own friends"
  ON gamebox.friends
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can remove their own friends
CREATE POLICY "Users can delete own friends"
  ON gamebox.friends
  FOR DELETE
  USING (auth.uid() = user_id);

