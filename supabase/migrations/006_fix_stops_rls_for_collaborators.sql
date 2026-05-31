-- Fix: collaborators get RLS violation when inserting stops.
-- The "Stops: editor can insert" policy joins trip_days → trips under the
-- caller's RLS context. Collaborators can't see trips via the trips SELECT
-- policy until they pass through trip_days first, causing a circular failure.
-- Solution: SECURITY DEFINER helper that resolves day_id → trip_id bypassing RLS.

create or replace function public.user_can_edit_trip_via_day(p_day_id uuid)
returns boolean as $$
declare
  v_trip_id uuid;
begin
  select trip_id into v_trip_id from public.trip_days where id = p_day_id;
  if v_trip_id is null then
    return false;
  end if;
  return public.user_can_edit_trip(v_trip_id);
end;
$$ language plpgsql security definer stable;

-- Replace stops policies to use the new helper

drop policy if exists "Stops: editor can insert" on public.stops;
create policy "Stops: editor can insert"
  on public.stops for insert with check (
    public.user_can_edit_trip_via_day(day_id)
  );

drop policy if exists "Stops: editor can update" on public.stops;
create policy "Stops: editor can update"
  on public.stops for update using (
    public.user_can_edit_trip_via_day(day_id)
  );

drop policy if exists "Stops: editor can delete" on public.stops;
create policy "Stops: editor can delete"
  on public.stops for delete using (
    public.user_can_edit_trip_via_day(day_id)
  );

-- Also fix the SELECT policy for stops (same nested RLS issue)
create or replace function public.user_can_access_trip_via_day(p_day_id uuid)
returns boolean as $$
declare
  v_trip_id uuid;
begin
  select trip_id into v_trip_id from public.trip_days where id = p_day_id;
  if v_trip_id is null then
    return false;
  end if;
  return public.user_can_access_trip(v_trip_id);
end;
$$ language plpgsql security definer stable;

drop policy if exists "Stops: member can read" on public.stops;
create policy "Stops: member can read"
  on public.stops for select using (
    public.user_can_access_trip_via_day(day_id)
    or exists (
      select 1 from public.trip_days
      join public.trips on trips.id = trip_days.trip_id
      where trip_days.id = stops.day_id
      and trips.share_token is not null
    )
  );

-- Apply same fix to stop_photos policies (same nested join issue)

create or replace function public.user_can_edit_trip_via_stop(p_stop_id uuid)
returns boolean as $$
declare
  v_day_id uuid;
begin
  select day_id into v_day_id from public.stops where id = p_stop_id;
  if v_day_id is null then
    return false;
  end if;
  return public.user_can_edit_trip_via_day(v_day_id);
end;
$$ language plpgsql security definer stable;

drop policy if exists "Photos: editor can insert" on public.stop_photos;
create policy "Photos: editor can insert"
  on public.stop_photos for insert with check (
    public.user_can_edit_trip_via_stop(stop_id)
  );

drop policy if exists "Photos: editor can update" on public.stop_photos;
create policy "Photos: editor can update"
  on public.stop_photos for update using (
    public.user_can_edit_trip_via_stop(stop_id)
  );

drop policy if exists "Photos: editor can delete" on public.stop_photos;
create policy "Photos: editor can delete"
  on public.stop_photos for delete using (
    public.user_can_edit_trip_via_stop(stop_id)
  );

create or replace function public.user_can_access_trip_via_stop(p_stop_id uuid)
returns boolean as $$
declare
  v_day_id uuid;
begin
  select day_id into v_day_id from public.stops where id = p_stop_id;
  if v_day_id is null then
    return false;
  end if;
  return public.user_can_access_trip_via_day(v_day_id);
end;
$$ language plpgsql security definer stable;

drop policy if exists "Photos: member can read" on public.stop_photos;
create policy "Photos: member can read"
  on public.stop_photos for select using (
    public.user_can_access_trip_via_stop(stop_id)
    or exists (
      select 1 from public.stops
      join public.trip_days on trip_days.id = stops.day_id
      join public.trips on trips.id = trip_days.trip_id
      where stops.id = stop_photos.stop_id
      and trips.share_token is not null
    )
  );
