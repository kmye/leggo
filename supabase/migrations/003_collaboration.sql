-- Invite status enum
create type invite_status as enum ('pending', 'accepted', 'revoked');

-- Trip invites table
create table public.trip_invites (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  inviter_id uuid not null references public.users(id) on delete cascade,
  role member_role not null default 'viewer',
  token uuid not null default uuid_generate_v4(),
  status invite_status not null default 'pending',
  accepted_by uuid references public.users(id),
  created_at timestamptz default now() not null,
  expires_at timestamptz not null default (now() + interval '7 days')
);

create unique index idx_trip_invites_token on public.trip_invites(token);
create index idx_trip_invites_trip on public.trip_invites(trip_id);

-- Destination columns on trips
alter table public.trips
  add column destination_lat decimal,
  add column destination_lng decimal,
  add column destination_name text;

-- Helper functions for RLS
create or replace function public.user_can_access_trip(p_trip_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.trips where id = p_trip_id and owner_id = auth.uid()
  ) or exists (
    select 1 from public.trip_members where trip_id = p_trip_id and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer stable;

create or replace function public.user_can_edit_trip(p_trip_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.trips where id = p_trip_id and owner_id = auth.uid()
  ) or exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = auth.uid() and role in ('owner', 'editor')
  );
end;
$$ language plpgsql security definer stable;

-- Drop existing policies
drop policy if exists "Owner can manage trips" on public.trips;
drop policy if exists "Share token grants read access" on public.trips;
drop policy if exists "Trip days accessible by trip owner" on public.trip_days;
drop policy if exists "Trip days readable via share token" on public.trip_days;
drop policy if exists "Stops accessible by trip owner" on public.stops;
drop policy if exists "Stops readable via share token" on public.stops;
drop policy if exists "Photos accessible by trip owner" on public.stop_photos;
drop policy if exists "Photos readable via share token" on public.stop_photos;
drop policy if exists "Trip members managed by trip owner" on public.trip_members;

-- Rewritten policies: trips
-- NOTE: We cannot call user_can_access_trip() here because it queries trip_members,
-- whose "owner can manage" policy queries trips — creating a circular RLS dependency.
-- Instead, inline the trip_members check and bypass RLS on trip_members via a helper.
create or replace function public.is_trip_member(p_trip_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.trip_members where trip_id = p_trip_id and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer stable;

create policy "Trips: owner or member can read"
  on public.trips for select using (
    auth.uid() = owner_id
    or public.is_trip_member(id)
    or share_token is not null
  );

create policy "Trips: owner can insert"
  on public.trips for insert with check (auth.uid() = owner_id);

create policy "Trips: owner can update"
  on public.trips for update using (auth.uid() = owner_id);

create policy "Trips: owner can delete"
  on public.trips for delete using (auth.uid() = owner_id);

-- Rewritten policies: trip_days
create policy "Trip days: member can read"
  on public.trip_days for select using (
    public.user_can_access_trip(trip_id)
    or exists (select 1 from public.trips where id = trip_id and share_token is not null)
  );

create policy "Trip days: editor can insert"
  on public.trip_days for insert with check (public.user_can_edit_trip(trip_id));

create policy "Trip days: editor can update"
  on public.trip_days for update using (public.user_can_edit_trip(trip_id));

create policy "Trip days: editor can delete"
  on public.trip_days for delete using (public.user_can_edit_trip(trip_id));

-- Rewritten policies: stops
create policy "Stops: member can read"
  on public.stops for select using (
    exists (
      select 1 from public.trip_days
      join public.trips on trips.id = trip_days.trip_id
      where trip_days.id = stops.day_id
      and (public.user_can_access_trip(trips.id) or trips.share_token is not null)
    )
  );

create policy "Stops: editor can insert"
  on public.stops for insert with check (
    exists (
      select 1 from public.trip_days
      join public.trips on trips.id = trip_days.trip_id
      where trip_days.id = stops.day_id
      and public.user_can_edit_trip(trips.id)
    )
  );

create policy "Stops: editor can update"
  on public.stops for update using (
    exists (
      select 1 from public.trip_days
      join public.trips on trips.id = trip_days.trip_id
      where trip_days.id = stops.day_id
      and public.user_can_edit_trip(trips.id)
    )
  );

create policy "Stops: editor can delete"
  on public.stops for delete using (
    exists (
      select 1 from public.trip_days
      join public.trips on trips.id = trip_days.trip_id
      where trip_days.id = stops.day_id
      and public.user_can_edit_trip(trips.id)
    )
  );

-- Rewritten policies: stop_photos
create policy "Photos: member can read"
  on public.stop_photos for select using (
    exists (
      select 1 from public.stops
      join public.trip_days on trip_days.id = stops.day_id
      join public.trips on trips.id = trip_days.trip_id
      where stops.id = stop_photos.stop_id
      and (public.user_can_access_trip(trips.id) or trips.share_token is not null)
    )
  );

create policy "Photos: editor can insert"
  on public.stop_photos for insert with check (
    exists (
      select 1 from public.stops
      join public.trip_days on trip_days.id = stops.day_id
      join public.trips on trips.id = trip_days.trip_id
      where stops.id = stop_photos.stop_id
      and public.user_can_edit_trip(trips.id)
    )
  );

create policy "Photos: editor can update"
  on public.stop_photos for update using (
    exists (
      select 1 from public.stops
      join public.trip_days on trip_days.id = stops.day_id
      join public.trips on trips.id = trip_days.trip_id
      where stops.id = stop_photos.stop_id
      and public.user_can_edit_trip(trips.id)
    )
  );

create policy "Photos: editor can delete"
  on public.stop_photos for delete using (
    exists (
      select 1 from public.stops
      join public.trip_days on trip_days.id = stops.day_id
      join public.trips on trips.id = trip_days.trip_id
      where stops.id = stop_photos.stop_id
      and public.user_can_edit_trip(trips.id)
    )
  );

-- Policies: trip_members
-- Use a SECURITY DEFINER function to check trip ownership without triggering
-- trips' RLS (which itself checks trip_members — circular dependency).
create or replace function public.is_trip_owner(p_trip_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.trips where id = p_trip_id and owner_id = auth.uid()
  );
end;
$$ language plpgsql security definer stable;

create policy "Trip members: owner can manage"
  on public.trip_members for all using (public.is_trip_owner(trip_id));

create policy "Trip members: member can read own"
  on public.trip_members for select using (user_id = auth.uid());

-- Policies: trip_invites
alter table public.trip_invites enable row level security;

create policy "Invites: owner can manage"
  on public.trip_invites for all using (public.is_trip_owner(trip_id));

create policy "Invites: anyone can read by token"
  on public.trip_invites for select using (true);

-- Enable realtime for collaboration tables
alter publication supabase_realtime add table public.trip_days;
alter publication supabase_realtime add table public.stops;
alter publication supabase_realtime add table public.stop_photos;
alter publication supabase_realtime add table public.trip_members;
