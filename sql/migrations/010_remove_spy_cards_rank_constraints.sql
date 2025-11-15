-- Migration: Remove Rank Constraints from spy_cards Table
-- Description: Removes CHECK constraints on rank columns to allow ranks to be calculated later based on final score count
-- Ranks will be calculated dynamically, so they should not be restricted to 1-5 range

-- Drop existing CHECK constraints on rank columns
-- PostgreSQL auto-generates constraint names, so we find them by checking the constraint definition
DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  -- Find and drop all CHECK constraints on rank columns that restrict values to 1-5
  FOR constraint_record IN
    SELECT conname, conrelid::regclass::text as table_name
    FROM pg_constraint
    WHERE conrelid = 'spy_cards'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%>= 1%'
      AND pg_get_constraintdef(oid) LIKE '%<= 5%'
      AND (
        pg_get_constraintdef(oid) LIKE '%rank%'
      )
  LOOP
    EXECUTE 'ALTER TABLE ' || constraint_record.table_name || ' DROP CONSTRAINT IF EXISTS ' || constraint_record.conname;
    RAISE NOTICE 'Dropped constraint: %', constraint_record.conname;
  END LOOP;
END $$;

-- Alter columns to allow NULL values and remove NOT NULL constraint
-- This allows ranks to be NULL until they are calculated
ALTER TABLE IF EXISTS spy_cards
  ALTER COLUMN mental_fortitude_composure_rank DROP NOT NULL,
  ALTER COLUMN adaptability_decision_making_rank DROP NOT NULL,
  ALTER COLUMN aim_mechanical_skill_rank DROP NOT NULL,
  ALTER COLUMN game_sense_awareness_rank DROP NOT NULL,
  ALTER COLUMN teamwork_communication_rank DROP NOT NULL,
  ALTER COLUMN strategy_rank DROP NOT NULL,
  ALTER COLUMN overall_rank DROP NOT NULL;

-- Set default values to 0 instead of 5
ALTER TABLE IF EXISTS spy_cards
  ALTER COLUMN mental_fortitude_composure_rank SET DEFAULT 0,
  ALTER COLUMN adaptability_decision_making_rank SET DEFAULT 0,
  ALTER COLUMN aim_mechanical_skill_rank SET DEFAULT 0,
  ALTER COLUMN game_sense_awareness_rank SET DEFAULT 0,
  ALTER COLUMN teamwork_communication_rank SET DEFAULT 0,
  ALTER COLUMN strategy_rank SET DEFAULT 0,
  ALTER COLUMN overall_rank SET DEFAULT 0;

