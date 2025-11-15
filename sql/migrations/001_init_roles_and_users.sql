-- create the schema
create schema gamebox;

-- create the table (role, description)
create table gamebox.user_roles (
  role text not null default 'user'::text,
  description text null,
  constraint user_roles_pkey primary key (role),
  constraint user_roles_role_key unique (role)
) TABLESPACE pg_default;

-- insert default roles (MUST be done before creating the users table)
insert into gamebox.user_roles (role, description) values
  ('user', 'Regular user with basic access'),
  ('admin', 'Administrator with full system access'),
  ('moderator', 'Moderator with limited administrative access');

-- create the table (id, created_at, email, name, avatar_url, role)
create table gamebox.user_profiles (
  id uuid not null default auth.uid (),
  created_at timestamp with time zone not null default now(),
  email text not null,
  name text not null default ''::text,
  avatar_url text null,
  role text not null default 'user'::text,
  constraint user_profiles_pkey primary key (id),
  constraint user_profiles_email_key unique (email),
  constraint user_profiles_name_key unique (name),
  constraint user_profiles_role_fkey foreign KEY (role) references gamebox.user_roles (role) on update CASCADE on delete set default
) TABLESPACE pg_default;

-- setup row level security for user_roles
alter table gamebox.user_roles enable row level security;

-- for now, only allow admins to update roles
create policy "Enable admin role management" on gamebox.user_roles for update using (
  exists (
    select 1 from gamebox.user_profiles
    where id = auth.uid() and role = 'admin'
  )
);

-- setup row level security for user_profiles
alter table gamebox.user_profiles enable row level security;

-- allow all users to read the table
create policy "Enable read access for all users" on gamebox.user_profiles for select using (true);

-- allow authenticated users to insert a row
create policy "Enable insert access for authenticated users" on gamebox.user_profiles for insert with check (auth.uid() = id);

-- allow users to update their own profile EXCEPT the role field
create policy "Enable update access for authenticated users" on gamebox.user_profiles for update using (auth.uid() = id) with check (
  role = (select role from gamebox.user_profiles where id = auth.uid())
);

-- allow admins to update any profile including roles
create policy "Enable admin profile management" on gamebox.user_profiles for update using (
  exists (
    select 1 from gamebox.user_profiles
    where id = auth.uid() and role = 'admin'
  )
);

-- service role permissions
GRANT USAGE ON SCHEMA gamebox TO service_role;
GRANT ALL ON gamebox.user_profiles TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA gamebox TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA gamebox GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA gamebox GRANT USAGE, SELECT ON SEQUENCES TO service_role;

-- function to handle new users

-- copy the data and metadata from the auth.users table into the gamebox.user_profile table
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
  name_value := coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), 
                             split_part(new.email, '@', 1));
  
  -- Extract avatar URL from metadata
  avatar_url_value := new.raw_user_meta_data ->> 'avatar_url';
  
  insert into gamebox.user_profiles (id, email, created_at, name, avatar_url, role)
  values (new.id, new.email, new.created_at, name_value, avatar_url_value, 'user');
  return new;
end;
$$;

-- trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure gamebox.handle_new_user();