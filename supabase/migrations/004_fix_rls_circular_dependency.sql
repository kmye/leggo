-- Fix circular RLS dependency: trips SELECT policy checks trip_members,
-- whose "owner can manage" policy checks trips → infinite recursion.
-- Solution: SECURITY DEFINER functions that bypass RLS when crossing tables.

-- Helper: check if user is a member of a trip (bypasses trip_members RLS)
create or replace function public.is_trip_member(p_trip_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.trip_members where trip_id = p_trip_id and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer stable;

-- Helper: check if user is the owner of a trip (bypasses trips RLS)
create or replace function public.is_trip_owner(p_trip_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.trips where id = p_trip_id and owner_id = auth.uid()
  );
end;
$$ language plpgsql security definer stable;

-- Fix trips SELECT policy
drop policy if exists "Trips: owner or member can read" on public.trips;
create policy "Trips: owner or member can read"
  on public.trips for select using (
    auth.uid() = owner_id
    or public.is_trip_member(id)
    or share_token is not null
  );

-- Fix trip_members policies
drop policy if exists "Trip members: owner can manage" on public.trip_members;
create policy "Trip members: owner can manage"
  on public.trip_members for all using (public.is_trip_owner(trip_id));

-- Fix trip_invites policy
drop policy if exists "Invites: owner can manage" on public.trip_invites;
create policy "Invites: owner can manage"
  on public.trip_invites for all using (public.is_trip_owner(trip_id));
