-- ============================================================================
-- FUNCTION: Handle new user creation
-- ============================================================================
-- This function copies data from auth.users to gamebox.user_profiles
-- and creates a spy card entry for the new user

-- Drop existing function if it exists (for idempotency)
-- Drop existing trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_spy_card ON auth.users;
DROP FUNCTION IF EXISTS gamebox.handle_new_user();
DROP FUNCTION IF EXISTS gamebox.handle_new_spy_card();
create function gamebox.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  name_value text;
  avatar_url_value text;
begin
  -- Extract name from metadata, fallback to email prefix if null/empty
  name_value := coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), 
                             split_part(new.email, '@', 1));
  
  -- Extract avatar URL from metadata
  avatar_url_value := new.raw_user_meta_data ->> 'avatar_url';
  
  insert into gamebox.user_profiles (id, email, created_at, username, avatar_url, role)
  values (new.id, new.email, new.created_at, name_value, avatar_url_value, 'user');
  return new;
end;
$$;

-- ============================================================================
-- FUNCTION: Handle new spy card creation
-- ============================================================================
-- This function creates a spy card entry for a new user
-- Uses the exact username from auth metadata

create function gamebox.handle_new_spy_card()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  username_value text;
begin
  -- Extract username from metadata, fallback to email prefix if null/empty
  -- Use the exact same logic as handle_new_user() to get the username
  username_value := coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), 
                             split_part(new.email, '@', 1));
  
  -- Create spy card entry with default values
  -- Use exact username from metadata (same as user_profiles.username)
  insert into gamebox.spy_cards (
    id,
    username,
    xp_points,
    mental_fortitude_composure_score,
    adaptability_decision_making_score,
    aim_mechanical_skill_score,
    game_sense_awareness_score,
    teamwork_communication_score,
    strategy_score,
    mental_fortitude_composure_rank,
    adaptability_decision_making_rank,
    aim_mechanical_skill_rank,
    game_sense_awareness_rank,
    teamwork_communication_rank,
    strategy_rank,
    overall_rank,
    total_score
  ) values (
    gen_random_uuid(),
    username_value,
    0,  -- xp_points
    0,  -- mental_fortitude_composure_score
    0,  -- adaptability_decision_making_score
    0,  -- aim_mechanical_skill_score
    0,  -- game_sense_awareness_score
    0,  -- teamwork_communication_score
    0,  -- strategy_score
    1,  -- mental_fortitude_composure_rank
    1,  -- adaptability_decision_making_rank
    1,  -- aim_mechanical_skill_rank
    1,  -- game_sense_awareness_rank
    1,  -- teamwork_communication_rank
    1,  -- strategy_rank
    1,  -- overall_rank
    0   -- total_score
  ) on conflict (username) do nothing;
  
  return new;
exception
  when others then
    -- Log error but don't fail the user creation
    raise warning 'Error in handle_new_spy_card for user %: %', new.id, sqlerrm;
    return new;
end;
$$;

-- ============================================================================
-- TRIGGERS: Execute functions on new user creation
-- ============================================================================

-- Trigger to create user profile
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure gamebox.handle_new_user();
 
-- Trigger to create spy card
create trigger on_auth_user_created_spy_card
  after insert on auth.users
  for each row execute procedure gamebox.handle_new_spy_card();
