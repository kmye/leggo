-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (synced from Supabase Auth)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  avatar_url text,
  created_at timestamptz default now() not null
);

-- Trips table
create type trip_status as enum ('planning', 'active', 'completed');

create table public.trips (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text default '',
  status trip_status default 'planning' not null,
  cover_image_url text,
  share_token uuid,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_trips_owner on public.trips(owner_id);
create unique index idx_trips_share_token on public.trips(share_token) where share_token is not null;

-- Trip members (for future collaboration)
create type member_role as enum ('owner', 'editor', 'viewer');

create table public.trip_members (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role member_role not null default 'viewer',
  invited_at timestamptz default now() not null,
  primary key (trip_id, user_id)
);

-- Trip days
create table public.trip_days (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  date date,
  day_number integer not null,
  notes text default '',
  constraint unique_day_number unique (trip_id, day_number)
);

create index idx_trip_days_trip on public.trip_days(trip_id);

-- Stops
create type stop_category as enum ('food', 'sightseeing', 'hotel', 'transport', 'shopping', 'other');

create table public.stops (
  id uuid primary key default uuid_generate_v4(),
  day_id uuid not null references public.trip_days(id) on delete cascade,
  order_index integer not null,
  name text not null,
  latitude decimal not null,
  longitude decimal not null,
  country_code text default 'CN',
  category stop_category default 'other' not null,
  time_start time,
  time_end time,
  notes text default '',
  estimated_budget decimal,
  currency text default 'CNY',
  links jsonb default '[]'::jsonb,
  booking_references jsonb default '[]'::jsonb,
  custom_fields jsonb default '[]'::jsonb,
  created_at timestamptz default now() not null
);

create index idx_stops_day on public.stops(day_id);

-- Stop photos
create table public.stop_photos (
  id uuid primary key default uuid_generate_v4(),
  stop_id uuid not null references public.stops(id) on delete cascade,
  storage_path text not null,
  caption text,
  order_index integer not null default 0,
  uploaded_at timestamptz default now() not null
);

create index idx_stop_photos_stop on public.stop_photos(stop_id);

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trips_updated_at
  before update on public.trips
  for each row execute function update_updated_at();

-- Row Level Security
alter table public.users enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_days enable row level security;
alter table public.stops enable row level security;
alter table public.stop_photos enable row level security;

-- Users: can read/update own profile
create policy "Users can read own profile"
  on public.users for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update using (auth.uid() = id);

-- Trips: owner can CRUD, share token grants read
create policy "Owner can manage trips"
  on public.trips for all using (auth.uid() = owner_id);

create policy "Share token grants read access"
  on public.trips for select using (share_token is not null);

-- Trip days: accessible if user owns the trip
create policy "Trip days accessible by trip owner"
  on public.trip_days for all using (
    exists (
      select 1 from public.trips
      where trips.id = trip_days.trip_id
      and trips.owner_id = auth.uid()
    )
  );

create policy "Trip days readable via share token"
  on public.trip_days for select using (
    exists (
      select 1 from public.trips
      where trips.id = trip_days.trip_id
      and trips.share_token is not null
    )
  );

-- Stops: accessible if user owns the trip
create policy "Stops accessible by trip owner"
  on public.stops for all using (
    exists (
      select 1 from public.trip_days
      join public.trips on trips.id = trip_days.trip_id
      where trip_days.id = stops.day_id
      and trips.owner_id = auth.uid()
    )
  );

create policy "Stops readable via share token"
  on public.stops for select using (
    exists (
      select 1 from public.trip_days
      join public.trips on trips.id = trip_days.trip_id
      where trip_days.id = stops.day_id
      and trips.share_token is not null
    )
  );

-- Stop photos: accessible if user owns the trip
create policy "Photos accessible by trip owner"
  on public.stop_photos for all using (
    exists (
      select 1 from public.stops
      join public.trip_days on trip_days.id = stops.day_id
      join public.trips on trips.id = trip_days.trip_id
      where stops.id = stop_photos.stop_id
      and trips.owner_id = auth.uid()
    )
  );

create policy "Photos readable via share token"
  on public.stop_photos for select using (
    exists (
      select 1 from public.stops
      join public.trip_days on trip_days.id = stops.day_id
      join public.trips on trips.id = trip_days.trip_id
      where stops.id = stop_photos.stop_id
      and trips.share_token is not null
    )
  );

-- Trip members: owner can manage
create policy "Trip members managed by trip owner"
  on public.trip_members for all using (
    exists (
      select 1 from public.trips
      where trips.id = trip_members.trip_id
      and trips.owner_id = auth.uid()
    )
  );

-- Function to create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
