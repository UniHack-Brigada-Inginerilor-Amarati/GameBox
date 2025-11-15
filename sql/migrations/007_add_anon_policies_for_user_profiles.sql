-- Add RLS policies that work with anon key for backend operations
-- These policies allow the backend to read and update user profiles using the anon key

-- Allow anon role to read all user profiles (backend needs this for lookups)
CREATE POLICY "Anon can read all user profiles" ON gamebox.user_profiles
FOR SELECT TO anon USING (true);

-- Allow anon role to update user profiles (backend needs this for profile updates)
-- This is safe because the backend will filter by user ID in the WHERE clause
CREATE POLICY "Anon can update user profiles" ON gamebox.user_profiles
FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Allow anon role to insert user profiles (for new user creation)
CREATE POLICY "Anon can insert user profiles" ON gamebox.user_profiles
FOR INSERT TO anon WITH CHECK (true);

-- Allow anon role to read mission sessions, session players and game results
CREATE POLICY "Anon can read mission sessions" ON gamebox.mission_sessions
FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can read session players" ON gamebox.session_players
FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can read game results" ON gamebox.game_results
FOR SELECT TO anon USING (true);

-- Allow anon role to insert mission sessions, session players and game results
CREATE POLICY "Anon can insert mission sessions" ON gamebox.mission_sessions
FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can insert session players" ON gamebox.session_players
FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can insert game results" ON gamebox.game_results
FOR INSERT TO anon WITH CHECK (true);

-- Allow anon role to update mission sessions, session players and game results
CREATE POLICY "Anon can update mission sessions" ON gamebox.mission_sessions
FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can update session players" ON gamebox.session_players
FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can update game results" ON gamebox.game_results
FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Allow anon role to delete mission sessions, session players and game results
CREATE POLICY "Anon can delete mission sessions" ON gamebox.mission_sessions
FOR DELETE TO anon USING (true);

CREATE POLICY "Anon can delete session players" ON gamebox.session_players
FOR DELETE TO anon USING (true);

CREATE POLICY "Anon can delete game results" ON gamebox.game_results
FOR DELETE TO anon USING (true);
