-- Migration: Create Reservation System
-- Description: Creates tables and policies for the reservation system including reservations, tokens, and RLS policies

-- Create reservations table in gamebox schema
CREATE TABLE gamebox.reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_time TIME NOT NULL,
  date DATE NOT NULL,
  game_mode TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  invitee_ids UUID[] DEFAULT '{}',
  participants JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reservation_tokens table in gamebox schema
CREATE TABLE gamebox.reservation_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID REFERENCES gamebox.reservations(id) ON DELETE CASCADE,
  token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Enable RLS on reservations table
ALTER TABLE gamebox.reservations ENABLE ROW LEVEL SECURITY;

-- Enable RLS on reservation_tokens table
ALTER TABLE gamebox.reservation_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for reservations table

-- Users can only see own reservations
CREATE POLICY "Users can only see own reservations"
  ON gamebox.reservations FOR SELECT
  USING (owner_id = auth.uid());

-- Invitees can see reservation details
CREATE POLICY "Invitees can see reservation details"
  ON gamebox.reservations FOR SELECT
  USING (auth.uid() = ANY(invitee_ids));

-- Users can insert own reservations
CREATE POLICY "Users can insert own reservations"
  ON gamebox.reservations FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Users can update own reservations
CREATE POLICY "Users can update own reservations"
  ON gamebox.reservations FOR UPDATE
  USING (owner_id = auth.uid());

-- Users can delete own reservations
CREATE POLICY "Users can delete own reservations"
  ON gamebox.reservations FOR DELETE
  USING (owner_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_reservations_owner_id ON gamebox.reservations(owner_id);
CREATE INDEX idx_reservations_date ON gamebox.reservations(date);
CREATE INDEX idx_reservations_status ON gamebox.reservations(status);
CREATE INDEX idx_reservation_tokens_token ON gamebox.reservation_tokens(token);
CREATE INDEX idx_reservation_tokens_expires_at ON gamebox.reservation_tokens(expires_at);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on reservations
CREATE TRIGGER update_reservations_updated_at 
    BEFORE UPDATE ON gamebox.reservations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON gamebox.reservations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON gamebox.reservation_tokens TO authenticated;

-- Grant select permissions to anonymous users for public access via tokens
GRANT SELECT ON gamebox.reservations TO anon;
GRANT SELECT ON gamebox.reservation_tokens TO anon;
