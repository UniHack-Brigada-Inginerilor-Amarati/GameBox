
-- Grant permissions to service role for payload schema
-- This allows the backend service to read from payload tables

-- Grant usage on payload schema
GRANT USAGE ON SCHEMA payload TO service_role;

-- Grant select permissions on all tables in payload schema
GRANT SELECT ON ALL TABLES IN SCHEMA payload TO service_role;

-- Grant select permissions on future tables in payload schema
ALTER DEFAULT PRIVILEGES IN SCHEMA payload GRANT SELECT ON TABLES TO service_role;

-- Grant usage on sequences in payload schema (for auto-incrementing IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA payload TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA payload GRANT USAGE, SELECT ON SEQUENCES TO service_role;