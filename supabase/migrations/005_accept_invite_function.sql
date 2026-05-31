-- Fix: collaborators could never be added to trip_members because the
-- acceptInvite server action ran under the collaborator's auth context,
-- which is blocked by the "Trip members: owner can manage" RLS policy.
-- This SECURITY DEFINER function bypasses RLS to atomically accept an invite.

create or replace function public.accept_trip_invite(p_token uuid)
returns uuid as $$
declare
  v_invite record;
  v_trip_id uuid;
begin
  select * into v_invite
  from public.trip_invites
  where token = p_token
    and status = 'pending'
    and expires_at > now();

  if not found then
    raise exception 'Invite not found, expired, or already used';
  end if;

  v_trip_id := v_invite.trip_id;

  insert into public.trip_members (trip_id, user_id, role)
  values (v_trip_id, auth.uid(), v_invite.role)
  on conflict (trip_id, user_id) do nothing;

  update public.trip_invites
  set status = 'accepted', accepted_by = auth.uid()
  where id = v_invite.id;

  return v_trip_id;
end;
$$ language plpgsql security definer;
