-- Grant permissions to anon role for gamebox schema
-- This allows the backend to access gamebox tables using the anon key

-- Grant usage on gamebox schema
GRANT USAGE ON SCHEMA gamebox TO anon;

-- Grant select permissions on all tables in gamebox schema
GRANT SELECT ON ALL TABLES IN SCHEMA gamebox TO anon;

-- Grant select permissions on future tables in gamebox schema
ALTER DEFAULT PRIVILEGES IN SCHEMA gamebox GRANT SELECT ON TABLES TO anon;

-- Grant usage on sequences in gamebox schema
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA gamebox TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA gamebox GRANT USAGE, SELECT ON SEQUENCES TO anon;

-- Grant insert, update, delete permissions for user_profiles table
GRANT INSERT, UPDATE, DELETE ON gamebox.user_profiles TO anon;

-- Grant insert, update, delete permissions for other gamebox tables
GRANT INSERT, UPDATE, DELETE ON gamebox.mission_sessions TO anon;
GRANT INSERT, UPDATE, DELETE ON gamebox.game_results TO anon;
GRANT INSERT, UPDATE, DELETE ON gamebox.session_players TO anon;

-- Create a policy that allows anon role to read all game_results
-- This works because the backend filters by player_id in the WHERE clause
CREATE POLICY "Anon can read all game results" ON gamebox.game_results
FOR SELECT TO anon USING (true);
