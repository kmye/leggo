# Phase 2: Collaborative Editing & Trip Discovery — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-user collaboration (invite links, role-based access, real-time sync) and Google Places discovery panel to the trip workspace.

**Architecture:** Supabase Realtime (Postgres Changes + Presence + Broadcast) for live collaboration. Server-side Next.js API routes proxy Google Places requests. RLS policies rewritten to use helper functions that check `trip_members` membership. Single-use invite tokens with manual link sharing.

**Tech Stack:** Next.js 16 App Router, Supabase (Auth, Realtime, RLS), Google Places API (New), @react-google-maps/api, Tailwind + shadcn/ui

---

## File Structure

### New Files

| Path | Responsibility |
|------|---------------|
| `supabase/migrations/003_collaboration.sql` | invite_status enum, trip_invites table, destination columns on trips, RLS helper functions, rewritten policies, realtime publication |
| `src/app/(protected)/invite/[token]/page.tsx` | Invite acceptance page (server component) |
| `src/lib/actions/invites.ts` | Server actions: createInvite, acceptInvite, revokeInvite, getInvites |
| `src/hooks/use-realtime-trip.ts` | Hook wrapping useTrip + Supabase Realtime subscriptions |
| `src/components/trip/members-panel.tsx` | Members list, pending invites, invite creation UI |
| `src/components/trip/presence-avatars.tsx` | Avatar stack showing online members |
| `src/app/api/places/search/route.ts` | Google Places search proxy (POST) |
| `src/app/api/places/[placeId]/route.ts` | Google Places details proxy (GET) |
| `src/components/trip/discovery-panel.tsx` | POI search panel with results list |
| `src/components/trip/place-card.tsx` | Individual place result card |

### Modified Files

| Path | Change |
|------|--------|
| `src/lib/types.ts` | Add TripInvite, PlaceResult, PresenceMember interfaces |
| `src/components/trip/trip-workspace.tsx` | Replace useTrip with useRealtimeTrip, add discovery panel, add members panel |
| `src/components/trip/trip-header.tsx` | Add presence avatars, members button |
| `src/components/map/google-map.tsx` | Add optional POI markers prop with toggle support |
| `src/components/map/map-container.tsx` | Pass POI markers through to GoogleMapView |
| `src/lib/supabase/middleware.ts` | Add `/invite` to protected routes |

---

## Task 1: Database Migration — Collaboration Schema

**Files:**
- Create: `supabase/migrations/003_collaboration.sql`

- [ ] **Step 1: Write the migration file**

```sql
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
create policy "Trips: owner or member can read"
  on public.trips for select using (
    auth.uid() = owner_id
    or exists (select 1 from public.trip_members where trip_id = id and user_id = auth.uid())
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
create policy "Trip members: owner can manage"
  on public.trip_members for all using (
    exists (select 1 from public.trips where id = trip_id and owner_id = auth.uid())
  );

create policy "Trip members: member can read own"
  on public.trip_members for select using (user_id = auth.uid());

-- Policies: trip_invites
alter table public.trip_invites enable row level security;

create policy "Invites: owner can manage"
  on public.trip_invites for all using (
    exists (select 1 from public.trips where id = trip_id and owner_id = auth.uid())
  );

create policy "Invites: anyone can read by token"
  on public.trip_invites for select using (true);

-- Enable realtime for collaboration tables
alter publication supabase_realtime add table public.trip_days;
alter publication supabase_realtime add table public.stops;
alter publication supabase_realtime add table public.stop_photos;
alter publication supabase_realtime add table public.trip_members;
```

- [ ] **Step 2: Apply the migration locally**

Run: `pnpm supabase db push` (or `pnpm supabase migration up` if using local Supabase)
Expected: Migration applies without errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/003_collaboration.sql
git commit -m "feat: add collaboration schema, RLS rewrite, and realtime publication"
```

---

## Task 2: TypeScript Types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add new type definitions**

Add to the end of `src/lib/types.ts`:

```typescript
export type InviteStatus = "pending" | "accepted" | "revoked";

export interface TripInvite {
  id: string;
  trip_id: string;
  inviter_id: string;
  role: MemberRole;
  token: string;
  status: InviteStatus;
  accepted_by: string | null;
  created_at: string;
  expires_at: string;
}

export interface TripMemberWithUser extends TripMember {
  users: Pick<User, "id" | "name" | "avatar_url" | "email">;
}

export interface PresenceMember {
  user_id: string;
  name: string;
  avatar_url: string | null;
  current_stop_id: string | null;
}

export interface PlaceResult {
  place_id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  rating: number | null;
  photo_url: string | null;
  types: string[];
  opening_hours?: { open_now: boolean };
}

export interface PlaceDetails extends PlaceResult {
  website: string | null;
  phone: string | null;
}
```

- [ ] **Step 2: Add destination fields to Trip interface**

In the `Trip` interface, add after `share_token`:

```typescript
  destination_lat: number | null;
  destination_lng: number | null;
  destination_name: string | null;
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add types for invites, presence, and places"
```

---

## Task 3: Invite Server Actions

**Files:**
- Create: `src/lib/actions/invites.ts`

- [ ] **Step 1: Create the server actions file**

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createInvite(tripId: string, role: "editor" | "viewer") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("trip_invites")
    .insert({
      trip_id: tripId,
      inviter_id: user.id,
      role,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getInvites(tripId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("trip_invites")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function revokeInvite(inviteId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("trip_invites")
    .update({ status: "revoked" })
    .eq("id", inviteId);

  if (error) throw new Error(error.message);
}

export async function acceptInvite(token: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/invite/" + token);

  const { data: invite, error: fetchError } = await supabase
    .from("trip_invites")
    .select("*")
    .eq("token", token)
    .eq("status", "pending")
    .single();

  if (fetchError || !invite) {
    return { error: "Invite not found or already used" };
  }

  if (new Date(invite.expires_at) < new Date()) {
    return { error: "Invite has expired" };
  }

  const { error: memberError } = await supabase
    .from("trip_members")
    .insert({
      trip_id: invite.trip_id,
      user_id: user.id,
      role: invite.role,
    });

  if (memberError) {
    if (memberError.code === "23505") {
      redirect(`/trip/${invite.trip_id}`);
    }
    return { error: memberError.message };
  }

  await supabase
    .from("trip_invites")
    .update({ status: "accepted", accepted_by: user.id })
    .eq("id", invite.id);

  redirect(`/trip/${invite.trip_id}`);
}

export async function getMembers(tripId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("trip_members")
    .select("*, users(id, name, avatar_url, email)")
    .eq("trip_id", tripId);

  if (error) throw new Error(error.message);
  return data;
}

export async function removeMember(tripId: string, userId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("trip_members")
    .delete()
    .eq("trip_id", tripId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/actions/invites.ts
git commit -m "feat: add invite server actions (create, accept, revoke, members)"
```

---

## Task 4: Invite Acceptance Page

**Files:**
- Create: `src/app/(protected)/invite/[token]/page.tsx`
- Modify: `src/lib/supabase/middleware.ts`

- [ ] **Step 1: Add `/invite` to protected routes in middleware**

In `src/lib/supabase/middleware.ts`, change the `isProtectedRoute` check:

```typescript
  const isProtectedRoute = request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/invite") ||
    (request.nextUrl.pathname.startsWith("/trip") && !request.nextUrl.pathname.includes("/share"));
```

- [ ] **Step 2: Create the invite acceptance page**

```typescript
import { acceptInvite } from "@/lib/actions/invites";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await acceptInvite(token);

  if (result?.error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold">Invite Error</h1>
          <p className="text-muted-foreground">{result.error}</p>
          <a href="/dashboard" className="text-primary underline">
            Go to dashboard
          </a>
        </div>
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(protected)/invite/[token]/page.tsx src/lib/supabase/middleware.ts
git commit -m "feat: add invite acceptance page and protect /invite route"
```

---

## Task 5: Members Panel UI

**Files:**
- Create: `src/components/trip/members-panel.tsx`

- [ ] **Step 1: Create the members panel component**

```typescript
"use client";

import { useState, useEffect } from "react";
import { Users, Copy, X, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createInvite, getInvites, revokeInvite, getMembers, removeMember } from "@/lib/actions/invites";
import type { TripInvite, TripMemberWithUser, MemberRole } from "@/lib/types";

interface MembersPanelProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  isOwner: boolean;
}

export function MembersPanel({ open, onClose, tripId, isOwner }: MembersPanelProps) {
  const [members, setMembers] = useState<TripMemberWithUser[]>([]);
  const [invites, setInvites] = useState<TripInvite[]>([]);
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    const [membersData, invitesData] = await Promise.all([
      getMembers(tripId),
      getInvites(tripId),
    ]);
    setMembers(membersData as TripMemberWithUser[]);
    setInvites(invitesData as TripInvite[]);
    setGeneratedLink(null);
  };

  const handleCreateInvite = async () => {
    const invite = await createInvite(tripId, inviteRole);
    setGeneratedLink(`${origin}/invite/${invite.token}`);
    setInvites((prev) => [invite as TripInvite, ...prev]);
  };

  const handleRevoke = async (inviteId: string) => {
    await revokeInvite(inviteId);
    setInvites((prev) =>
      prev.map((i) => (i.id === inviteId ? { ...i, status: "revoked" as const } : i))
    );
  };

  const handleRemoveMember = async (userId: string) => {
    await removeMember(tripId, userId);
    setMembers((prev) => prev.filter((m) => m.user_id !== userId));
  };

  const handleCopy = async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pendingInvites = invites.filter((i) => i.status === "pending");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-5" />
            Members
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current members */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Members</h3>
            {members.length === 0 && (
              <p className="text-sm text-muted-foreground">No collaborators yet.</p>
            )}
            {members.map((member) => (
              <div key={member.user_id} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  {member.users.avatar_url && (
                    <img
                      src={member.users.avatar_url}
                      alt=""
                      className="size-6 rounded-full"
                    />
                  )}
                  <span className="text-sm">{member.users.name || member.users.email}</span>
                  <Badge variant="secondary" className="text-xs">{member.role}</Badge>
                </div>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={() => handleRemoveMember(member.user_id)}
                  >
                    <X className="size-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Create invite (owner only) */}
          {isOwner && (
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-medium">Invite Link</h3>
              <div className="flex gap-2">
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "editor" | "viewer")}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleCreateInvite} className="flex-1">
                  Generate Link
                </Button>
              </div>

              {generatedLink && (
                <div className="flex gap-2 items-center">
                  <code className="flex-1 text-xs bg-muted p-2 rounded truncate">
                    {generatedLink}
                  </code>
                  <Button variant="outline" size="icon" className="size-8 shrink-0" onClick={handleCopy}>
                    {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                  </Button>
                </div>
              )}

              {/* Pending invites */}
              {pendingInvites.length > 0 && (
                <div className="space-y-1 pt-2">
                  <h4 className="text-xs text-muted-foreground">Active Invites</h4>
                  {pendingInvites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{invite.role}</Badge>
                        <span className="text-xs text-muted-foreground">
                          expires {new Date(invite.expires_at).toLocaleDateString()}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-destructive"
                        onClick={() => handleRevoke(invite.id)}
                      >
                        Revoke
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/trip/members-panel.tsx
git commit -m "feat: add members panel with invite link generation"
```

---

## Task 6: Presence Avatars Component

**Files:**
- Create: `src/components/trip/presence-avatars.tsx`

- [ ] **Step 1: Create the presence avatars component**

```typescript
"use client";

import type { PresenceMember } from "@/lib/types";

interface PresenceAvatarsProps {
  members: PresenceMember[];
}

export function PresenceAvatars({ members }: PresenceAvatarsProps) {
  if (members.length === 0) return null;

  const visible = members.slice(0, 3);
  const overflow = members.length - 3;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((member) => (
        <div
          key={member.user_id}
          className="relative size-7 rounded-full border-2 border-background"
          title={member.name}
        >
          {member.avatar_url ? (
            <img
              src={member.avatar_url}
              alt={member.name}
              className="size-full rounded-full object-cover"
            />
          ) : (
            <div className="size-full rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
              {member.name?.charAt(0) || "?"}
            </div>
          )}
          <span className="absolute bottom-0 right-0 size-2 rounded-full bg-green-500 border border-background" />
        </div>
      ))}
      {overflow > 0 && (
        <div className="size-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium">
          +{overflow}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/trip/presence-avatars.tsx
git commit -m "feat: add presence avatars component"
```

---

## Task 7: useRealtimeTrip Hook

**Files:**
- Create: `src/hooks/use-realtime-trip.ts`

- [ ] **Step 1: Create the realtime trip hook**

```typescript
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTrip } from "./use-trip";
import type { PresenceMember, DayWithStops, StopWithPhotos } from "@/lib/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

export function useRealtimeTrip(tripId: string, currentUser: { id: string; name: string; avatar_url: string | null }) {
  const tripHook = useTrip(tripId);
  const [onlineMembers, setOnlineMembers] = useState<PresenceMember[]>([]);
  const [currentStopId, setCurrentStopId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const channel: RealtimeChannel = supabase.channel(`trip:${tripId}`, {
      config: { presence: { key: currentUser.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceMember>();
        const members: PresenceMember[] = [];
        for (const [, presences] of Object.entries(state)) {
          for (const p of presences) {
            if (p.user_id !== currentUser.id) {
              members.push({
                user_id: p.user_id,
                name: p.name,
                avatar_url: p.avatar_url,
                current_stop_id: p.current_stop_id,
              });
            }
          }
        }
        setOnlineMembers(members);
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stops" },
        () => { tripHook.refetch(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trip_days" },
        () => { tripHook.refetch(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stop_photos" },
        () => { tripHook.refetch(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trip_members" },
        () => { tripHook.refetch(); }
      )
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: currentUser.id,
            name: currentUser.name,
            avatar_url: currentUser.avatar_url,
            current_stop_id: currentStopId,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, currentUser.id]);

  const updatePresenceStop = useCallback(async (stopId: string | null) => {
    setCurrentStopId(stopId);
    const channel = supabase.channel(`trip:${tripId}`);
    await channel.track({
      user_id: currentUser.id,
      name: currentUser.name,
      avatar_url: currentUser.avatar_url,
      current_stop_id: stopId,
    });
  }, [tripId, currentUser]);

  return {
    ...tripHook,
    onlineMembers,
    updatePresenceStop,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-realtime-trip.ts
git commit -m "feat: add useRealtimeTrip hook with presence and postgres changes"
```

---

## Task 8: Google Places API Routes

**Files:**
- Create: `src/app/api/places/search/route.ts`
- Create: `src/app/api/places/[placeId]/route.ts`

- [ ] **Step 1: Create the places search route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY!;
const PLACES_BASE_URL = "https://places.googleapis.com/v1/places";

const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { query, location, radius = 5000, type } = body;

  if (!location?.lat || !location?.lng) {
    return NextResponse.json({ error: "Location required" }, { status: 400 });
  }

  const cacheKey = JSON.stringify({ query, location, radius, type });
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  const requestBody: any = {
    locationBias: {
      circle: {
        center: { latitude: location.lat, longitude: location.lng },
        radius: radius,
      },
    },
    maxResultCount: 20,
  };

  if (query) {
    requestBody.textQuery = query;
  }

  if (type) {
    requestBody.includedTypes = [type];
  }

  const fieldMask = [
    "places.id",
    "places.displayName",
    "places.location",
    "places.formattedAddress",
    "places.rating",
    "places.photos",
    "places.types",
    "places.currentOpeningHours",
  ].join(",");

  const url = query
    ? `${PLACES_BASE_URL}:searchText`
    : `${PLACES_BASE_URL}:searchNearby`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": PLACES_API_KEY,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json({ error: "Places API error", details: err }, { status: 502 });
  }

  const data = await response.json();

  const places = (data.places || []).map((place: any) => ({
    place_id: place.id,
    name: place.displayName?.text || "",
    lat: place.location?.latitude,
    lng: place.location?.longitude,
    address: place.formattedAddress || "",
    rating: place.rating || null,
    photo_url: place.photos?.[0]?.name
      ? `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxHeightPx=200&key=${PLACES_API_KEY}`
      : null,
    types: place.types || [],
    opening_hours: place.currentOpeningHours
      ? { open_now: place.currentOpeningHours.openNow }
      : undefined,
  }));

  const result = { places };
  cache.set(cacheKey, { data: result, expires: Date.now() + CACHE_TTL });

  return NextResponse.json(result);
}
```

- [ ] **Step 2: Create the place details route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ placeId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { placeId } = await params;

  const fieldMask = [
    "id",
    "displayName",
    "location",
    "formattedAddress",
    "rating",
    "photos",
    "types",
    "currentOpeningHours",
    "websiteUri",
    "nationalPhoneNumber",
  ].join(",");

  const response = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}`,
    {
      headers: {
        "X-Goog-Api-Key": PLACES_API_KEY,
        "X-Goog-FieldMask": fieldMask,
      },
    }
  );

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json({ error: "Places API error", details: err }, { status: 502 });
  }

  const place = await response.json();

  const result = {
    place_id: place.id,
    name: place.displayName?.text || "",
    lat: place.location?.latitude,
    lng: place.location?.longitude,
    address: place.formattedAddress || "",
    rating: place.rating || null,
    photo_url: place.photos?.[0]?.name
      ? `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxHeightPx=400&key=${PLACES_API_KEY}`
      : null,
    types: place.types || [],
    opening_hours: place.currentOpeningHours
      ? { open_now: place.currentOpeningHours.openNow }
      : undefined,
    website: place.websiteUri || null,
    phone: place.nationalPhoneNumber || null,
  };

  return NextResponse.json(result);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/places/search/route.ts src/app/api/places/\[placeId\]/route.ts
git commit -m "feat: add Google Places API proxy routes (search + details)"
```

---

## Task 9: Discovery Panel UI

**Files:**
- Create: `src/components/trip/place-card.tsx`
- Create: `src/components/trip/discovery-panel.tsx`

- [ ] **Step 1: Create the place card component**

```typescript
"use client";

import { Star, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import type { PlaceResult, DayWithStops, StopCategory } from "@/lib/types";

const typeToCategory: Record<string, StopCategory> = {
  restaurant: "food",
  cafe: "food",
  bakery: "food",
  bar: "food",
  tourist_attraction: "sightseeing",
  museum: "sightseeing",
  park: "sightseeing",
  lodging: "hotel",
  transit_station: "transport",
  shopping_mall: "shopping",
  store: "shopping",
};

interface PlaceCardProps {
  place: PlaceResult;
  days: DayWithStops[];
  onAddToDay: (place: PlaceResult, dayId: string, category: StopCategory) => void;
}

export function PlaceCard({ place, days, onAddToDay }: PlaceCardProps) {
  const [adding, setAdding] = useState(false);

  const inferredCategory: StopCategory =
    place.types.reduce<StopCategory | null>((found, t) => {
      if (found) return found;
      return typeToCategory[t] || null;
    }, null) || "other";

  const handleAdd = (dayId: string) => {
    onAddToDay(place, dayId, inferredCategory);
    setAdding(false);
  };

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex gap-3">
        {place.photo_url && (
          <img
            src={place.photo_url}
            alt=""
            className="size-14 rounded object-cover shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium truncate">{place.name}</h4>
          <p className="text-xs text-muted-foreground truncate">{place.address}</p>
          {place.rating && (
            <div className="flex items-center gap-1 mt-0.5">
              <Star className="size-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs">{place.rating}</span>
            </div>
          )}
        </div>
      </div>

      {adding ? (
        <Select onValueChange={handleAdd}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Select day..." />
          </SelectTrigger>
          <SelectContent>
            {days.map((day) => (
              <SelectItem key={day.id} value={day.id}>
                Day {day.day_number}{day.date ? ` (${day.date})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full h-7 text-xs"
          onClick={() => setAdding(true)}
        >
          <Plus className="size-3 mr-1" />
          Add to Day
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the discovery panel component**

```typescript
"use client";

import { useState, useCallback } from "react";
import { Search, Compass, Eye, EyeOff, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlaceCard } from "./place-card";
import type { PlaceResult, DayWithStops, StopCategory } from "@/lib/types";

const CATEGORIES = [
  { label: "Food", type: "restaurant" },
  { label: "Sightseeing", type: "tourist_attraction" },
  { label: "Hotel", type: "lodging" },
  { label: "Shopping", type: "shopping_mall" },
] as const;

interface DiscoveryPanelProps {
  days: DayWithStops[];
  searchCenter: { lat: number; lng: number } | null;
  onAddPlace: (place: PlaceResult, dayId: string, category: StopCategory) => void;
  onClose: () => void;
  showOnMap: boolean;
  onToggleShowOnMap: () => void;
  onPlacesLoaded: (places: PlaceResult[]) => void;
}

export function DiscoveryPanel({
  days,
  searchCenter,
  onAddPlace,
  onClose,
  showOnMap,
  onToggleShowOnMap,
  onPlacesLoaded,
}: DiscoveryPanelProps) {
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const search = useCallback(async (searchQuery?: string, type?: string | null) => {
    if (!searchCenter) return;
    setLoading(true);

    const body: any = { location: searchCenter, radius: 5000 };
    if (searchQuery) body.query = searchQuery;
    if (type) body.type = type;

    try {
      const res = await fetch("/api/places/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setPlaces(data.places || []);
      onPlacesLoaded(data.places || []);
    } catch {
      setPlaces([]);
      onPlacesLoaded([]);
    } finally {
      setLoading(false);
    }
  }, [searchCenter, onPlacesLoaded]);

  const handleSearch = () => {
    search(query || undefined, selectedType);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleCategoryClick = (type: string) => {
    const newType = selectedType === type ? null : type;
    setSelectedType(newType);
    search(query || undefined, newType);
  };

  if (!searchCenter) {
    return (
      <div className="h-full flex flex-col p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium flex items-center gap-2">
            <Compass className="size-4" />
            Discover
          </h3>
          <Button variant="ghost" size="icon" className="size-6" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Add a stop to your trip first, or set a destination to start discovering places.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium flex items-center gap-2">
            <Compass className="size-4" />
            Discover
          </h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={onToggleShowOnMap}
              title={showOnMap ? "Hide from map" : "Show on map"}
            >
              {showOnMap ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search places..."
            className="h-8 text-sm"
          />
          <Button size="sm" className="h-8 px-3" onClick={handleSearch} disabled={loading}>
            <Search className="size-3" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <Badge
              key={cat.type}
              variant={selectedType === cat.type ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => handleCategoryClick(cat.type)}
            >
              {cat.label}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && <p className="text-sm text-muted-foreground">Searching...</p>}
        {!loading && places.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Search for places or select a category to get started.
          </p>
        )}
        {places.map((place) => (
          <PlaceCard
            key={place.place_id}
            place={place}
            days={days}
            onAddToDay={onAddPlace}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/trip/place-card.tsx src/components/trip/discovery-panel.tsx
git commit -m "feat: add discovery panel and place card components"
```

---

## Task 10: Update Map to Support POI Markers

**Files:**
- Modify: `src/components/map/google-map.tsx`
- Modify: `src/components/map/map-container.tsx`

- [ ] **Step 1: Add POI markers to GoogleMapView**

In `src/components/map/google-map.tsx`, update the interface and component:

Add to the imports area (after the existing type import):

```typescript
import type { StopWithPhotos, StopCategory, PlaceResult } from "@/lib/types";
```

Replace the `GoogleMapViewProps` interface:

```typescript
interface GoogleMapViewProps {
  stops: StopWithPhotos[];
  selectedStopId: string | null;
  onStopClick: (stopId: string) => void;
  onMapClick: (lat: number, lng: number) => void;
  poiMarkers?: PlaceResult[];
  showPoiMarkers?: boolean;
}
```

Update the component signature:

```typescript
export function GoogleMapView({
  stops,
  selectedStopId,
  onStopClick,
  onMapClick,
  poiMarkers = [],
  showPoiMarkers = false,
}: GoogleMapViewProps) {
```

Add POI markers before the closing `</GoogleMap>` tag (after the Polyline):

```typescript
      {showPoiMarkers && poiMarkers.map((poi) => (
        <Marker
          key={poi.place_id}
          position={{ lat: poi.lat, lng: poi.lng }}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#9ca3af",
            fillOpacity: 0.5,
            strokeColor: "#6b7280",
            strokeWeight: 1.5,
          }}
          title={poi.name}
        />
      ))}
```

- [ ] **Step 2: Update MapContainer to pass POI props**

Replace the contents of `src/components/map/map-container.tsx`:

```typescript
"use client";

import { GoogleMapView } from "./google-map";
import type { StopWithPhotos, PlaceResult } from "@/lib/types";

interface MapContainerProps {
  stops: StopWithPhotos[];
  selectedStopId: string | null;
  onStopClick: (stopId: string) => void;
  onMapClick: (lat: number, lng: number) => void;
  poiMarkers?: PlaceResult[];
  showPoiMarkers?: boolean;
}

export function MapContainer({
  stops,
  selectedStopId,
  onStopClick,
  onMapClick,
  poiMarkers,
  showPoiMarkers,
}: MapContainerProps) {
  return (
    <div className="relative w-full h-full">
      <GoogleMapView
        stops={stops}
        selectedStopId={selectedStopId}
        onStopClick={onStopClick}
        onMapClick={onMapClick}
        poiMarkers={poiMarkers}
        showPoiMarkers={showPoiMarkers}
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/map/google-map.tsx src/components/map/map-container.tsx
git commit -m "feat: add POI marker support to map components"
```

---

## Task 11: Wire Everything into TripWorkspace

**Files:**
- Modify: `src/components/trip/trip-workspace.tsx`
- Modify: `src/components/trip/trip-header.tsx`

- [ ] **Step 1: Update TripWorkspace to use realtime hook and add panels**

Replace the contents of `src/components/trip/trip-workspace.tsx`:

```typescript
"use client";

import { useState, useRef, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { useRealtimeTrip } from "@/hooks/use-realtime-trip";
import { useStops } from "@/hooks/use-stops";
import { TripHeader } from "./trip-header";
import { ItineraryPanel } from "./itinerary-panel";
import { StopDrawer } from "./stop-drawer";
import { AddStopDialog } from "./add-stop-dialog";
import { DiscoveryPanel } from "./discovery-panel";
import { MembersPanel } from "./members-panel";
import { MapContainer } from "@/components/map/map-container";
import type { StopWithPhotos, StopCategory, PlaceResult } from "@/lib/types";

interface PlaceData {
  name: string;
  latitude: number;
  longitude: number;
  countryCode: string;
  formattedAddress: string;
}

interface TripWorkspaceProps {
  tripId: string;
  currentUser: { id: string; name: string; avatar_url: string | null };
  isOwner: boolean;
}

export function TripWorkspace({ tripId, currentUser, isOwner }: TripWorkspaceProps) {
  const { trip, loading, refetch, updateTrip, updateStatus, addDay, removeDay, generateShareToken, revokeShareToken, onlineMembers, updatePresenceStop } = useRealtimeTrip(tripId, currentUser);
  const { addStop, updateStop, deleteStop, reorderStops } = useStops();

  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addStopOpen, setAddStopOpen] = useState(false);
  const [addStopDayId, setAddStopDayId] = useState<string | null>(null);
  const [mapClickPlace, setMapClickPlace] = useState<PlaceData | null>(null);
  const [discoveryOpen, setDiscoveryOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [showPoiOnMap, setShowPoiOnMap] = useState(true);
  const [poiMarkers, setPoiMarkers] = useState<PlaceResult[]>([]);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const allStops: StopWithPhotos[] = trip?.trip_days.flatMap((d) => d.stops) || [];

  const selectedStop = allStops.find((s) => s.id === selectedStopId) || null;

  const searchCenter = useMemo(() => {
    if (allStops.length > 0) {
      const avgLat = allStops.reduce((sum, s) => sum + s.latitude, 0) / allStops.length;
      const avgLng = allStops.reduce((sum, s) => sum + s.longitude, 0) / allStops.length;
      return { lat: avgLat, lng: avgLng };
    }
    if (trip?.destination_lat && trip?.destination_lng) {
      return { lat: trip.destination_lat, lng: trip.destination_lng };
    }
    return null;
  }, [allStops, trip?.destination_lat, trip?.destination_lng]);

  const handleStopClick = (stopId: string) => {
    setSelectedStopId(stopId);
    setDrawerOpen(true);
    updatePresenceStop(stopId);
  };

  const handleMapClick = async (lat: number, lng: number) => {
    if (!trip || trip.trip_days.length === 0) return;

    if (!geocoderRef.current && typeof google !== "undefined") {
      geocoderRef.current = new google.maps.Geocoder();
    }

    let placeData: PlaceData = {
      name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      latitude: lat,
      longitude: lng,
      countryCode: "",
      formattedAddress: "",
    };

    if (geocoderRef.current) {
      try {
        const response = await geocoderRef.current.geocode({ location: { lat, lng } });
        if (response.results && response.results.length > 0) {
          const result = response.results[0];
          const countryComponent = result.address_components.find(
            (c) => c.types.includes("country")
          );
          const nameComponent = result.address_components.find(
            (c) => c.types.includes("point_of_interest") || c.types.includes("premise")
          );
          placeData = {
            name: nameComponent?.long_name || result.address_components[0]?.long_name || placeData.name,
            latitude: lat,
            longitude: lng,
            countryCode: countryComponent?.short_name || "",
            formattedAddress: result.formatted_address,
          };
        }
      } catch {
        // Use fallback placeData with raw coords
      }
    }

    setMapClickPlace(placeData);
    setAddStopDayId(trip.trip_days[trip.trip_days.length - 1].id);
    setAddStopOpen(true);
  };

  const handleAddStopButton = (dayId: string) => {
    setAddStopDayId(dayId);
    setMapClickPlace(null);
    setAddStopOpen(true);
  };

  const handleAddStop = async (stopData: {
    name: string;
    latitude: number;
    longitude: number;
    country_code: string;
    category: StopCategory;
    notes: string;
  }) => {
    if (!addStopDayId || !trip) return;
    const day = trip.trip_days.find((d) => d.id === addStopDayId);
    const orderIndex = day ? day.stops.length : 0;

    await addStop(addStopDayId, {
      ...stopData,
      order_index: orderIndex,
      time_start: null,
      time_end: null,
      estimated_budget: null,
      currency: "CNY",
      links: [],
      booking_references: [],
      custom_fields: [],
    });
    refetch();
  };

  const handleAddPlace = async (place: PlaceResult, dayId: string, category: StopCategory) => {
    const day = trip?.trip_days.find((d) => d.id === dayId);
    const orderIndex = day ? day.stops.length : 0;

    await addStop(dayId, {
      name: place.name,
      latitude: place.lat,
      longitude: place.lng,
      country_code: "",
      category,
      order_index: orderIndex,
      time_start: null,
      time_end: null,
      notes: place.address,
      estimated_budget: null,
      currency: "CNY",
      links: [],
      booking_references: [],
      custom_fields: [],
    });
    refetch();
  };

  const handleSaveStop = async (stopId: string, updates: Partial<StopWithPhotos>) => {
    await updateStop(stopId, updates);
    refetch();
  };

  const handleDeleteStop = async (stopId: string) => {
    await deleteStop(stopId);
    setSelectedStopId(null);
    refetch();
  };

  const handleReorderStops = async (dayId: string, stopIds: string[]) => {
    await reorderStops(dayId, stopIds);
    refetch();
  };

  const handleAddDay = async () => {
    await addDay();
  };

  const handleRemoveDay = async (dayId: string) => {
    await removeDay(dayId);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    updatePresenceStop(null);
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="size-10 animate-spin text-muted-foreground" />
    </div>
  );
  if (!trip) return <div className="p-8 text-center">Trip not found.</div>;

  return (
    <div className="h-screen flex flex-col">
      <TripHeader
        trip={trip}
        onUpdateTrip={updateTrip}
        onUpdateStatus={updateStatus}
        onGenerateShare={generateShareToken}
        onRevokeShare={revokeShareToken}
        onlineMembers={onlineMembers}
        onOpenMembers={() => setMembersOpen(true)}
        onOpenDiscovery={() => setDiscoveryOpen(true)}
      />
      <div className="flex-1 flex overflow-hidden">
        <div className="w-[380px] border-r overflow-hidden flex-shrink-0 hidden md:block">
          {discoveryOpen ? (
            <DiscoveryPanel
              days={trip.trip_days}
              searchCenter={searchCenter}
              onAddPlace={handleAddPlace}
              onClose={() => { setDiscoveryOpen(false); setPoiMarkers([]); }}
              showOnMap={showPoiOnMap}
              onToggleShowOnMap={() => setShowPoiOnMap((v) => !v)}
              onPlacesLoaded={setPoiMarkers}
            />
          ) : (
            <ItineraryPanel
              days={trip.trip_days}
              selectedStopId={selectedStopId}
              onStopClick={handleStopClick}
              onAddStop={handleAddStopButton}
              onAddDay={handleAddDay}
              onRemoveDay={handleRemoveDay}
              onReorderStops={handleReorderStops}
            />
          )}
        </div>

        <div className="flex-1">
          <MapContainer
            stops={allStops}
            selectedStopId={selectedStopId}
            onStopClick={handleStopClick}
            onMapClick={handleMapClick}
            poiMarkers={discoveryOpen ? poiMarkers : undefined}
            showPoiMarkers={discoveryOpen && showPoiOnMap}
          />
        </div>
      </div>

      <div className="md:hidden border-t max-h-[40vh] overflow-y-auto">
        <ItineraryPanel
          days={trip.trip_days}
          selectedStopId={selectedStopId}
          onStopClick={handleStopClick}
          onAddStop={handleAddStopButton}
          onAddDay={handleAddDay}
          onRemoveDay={handleRemoveDay}
          onReorderStops={handleReorderStops}
        />
      </div>

      <StopDrawer
        stop={selectedStop}
        open={drawerOpen}
        onClose={handleDrawerClose}
        onSave={handleSaveStop}
        onDelete={handleDeleteStop}
        tripId={tripId}
        onPhotosUpdated={refetch}
      />

      <AddStopDialog
        open={addStopOpen}
        onClose={() => { setAddStopOpen(false); setMapClickPlace(null); }}
        onAdd={handleAddStop}
        initialPlace={mapClickPlace}
      />

      <MembersPanel
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        tripId={tripId}
        isOwner={isOwner}
      />
    </div>
  );
}
```

- [ ] **Step 2: Update TripHeader to show presence and new buttons**

Replace the contents of `src/components/trip/trip-header.tsx`:

```typescript
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Compass, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShareDialog } from "./share-dialog";
import { PresenceAvatars } from "./presence-avatars";
import type { Trip, TripStatus, TripWithDays, PresenceMember } from "@/lib/types";

interface TripHeaderProps {
  trip: Trip;
  onUpdateTrip: (updates: Partial<TripWithDays>) => Promise<{ error: any }>;
  onUpdateStatus: (status: TripStatus) => Promise<{ error: any }>;
  onGenerateShare: () => Promise<{ token: string | undefined; error: any }>;
  onRevokeShare: () => Promise<{ error: any }>;
  onlineMembers: PresenceMember[];
  onOpenMembers: () => void;
  onOpenDiscovery: () => void;
}

export function TripHeader({
  trip,
  onUpdateTrip,
  onUpdateStatus,
  onGenerateShare,
  onRevokeShare,
  onlineMembers,
  onOpenMembers,
  onOpenDiscovery,
}: TripHeaderProps) {
  const router = useRouter();
  const [shareOpen, setShareOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [title, setTitle] = useState(trip.title);
  const [description, setDescription] = useState(trip.description);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(trip.title);
    setDescription(trip.description);
  }, [trip.title, trip.description]);

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  useEffect(() => {
    if (editingDescription) descInputRef.current?.focus();
  }, [editingDescription]);

  const saveTitle = () => {
    setEditingTitle(false);
    const trimmed = title.trim();
    if (trimmed && trimmed !== trip.title) {
      onUpdateTrip({ title: trimmed });
    } else {
      setTitle(trip.title);
    }
  };

  const saveDescription = () => {
    setEditingDescription(false);
    if (description !== trip.description) {
      onUpdateTrip({ description });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => router.push("/dashboard")}>
            <ChevronLeft className="size-5" />
          </Button>
          {editingTitle ? (
            <Input
              ref={titleInputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveTitle();
                if (e.key === "Escape") { setTitle(trip.title); setEditingTitle(false); }
              }}
              className="h-8 text-lg font-semibold w-64"
            />
          ) : (
            <h1
              className="text-lg font-semibold cursor-pointer hover:text-primary/80 transition-colors"
              onClick={() => setEditingTitle(true)}
              title="Click to edit"
            >
              {trip.title}
            </h1>
          )}
          <Select
            value={trip.status}
            onValueChange={(v) => onUpdateStatus(v as TripStatus)}
          >
            <SelectTrigger className="w-[130px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <PresenceAvatars members={onlineMembers} />
          <Button variant="ghost" size="icon" className="size-8" onClick={onOpenDiscovery} title="Discover places">
            <Compass className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={onOpenMembers} title="Members">
            <Users className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
            Share
          </Button>
        </div>
      </div>
      {editingDescription ? (
        <div className="px-4 py-1 border-b">
          <Input
            ref={descInputRef}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveDescription}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveDescription();
              if (e.key === "Escape") { setDescription(trip.description); setEditingDescription(false); }
            }}
            placeholder="Add a trip description..."
            className="h-7 text-sm text-muted-foreground border-none shadow-none px-0 focus-visible:ring-0"
          />
        </div>
      ) : (
        <div
          className="px-4 py-1 border-b cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => setEditingDescription(true)}
          title="Click to edit description"
        >
          <p className="text-sm text-muted-foreground">
            {trip.description || "Add a trip description..."}
          </p>
        </div>
      )}
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        shareToken={trip.share_token}
        tripId={trip.id}
        onGenerate={onGenerateShare}
        onRevoke={onRevokeShare}
      />
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/trip/trip-workspace.tsx src/components/trip/trip-header.tsx
git commit -m "feat: integrate realtime, discovery, and members into trip workspace"
```

---

## Task 12: Update Trip Page to Pass User Context

**Files:**
- Modify: `src/app/(protected)/trip/[id]/page.tsx`

- [ ] **Step 1: Update the trip page server component**

Replace the contents of `src/app/(protected)/trip/[id]/page.tsx`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { TripWorkspace } from "@/components/trip/trip-workspace";
import { redirect } from "next/navigation";

export default async function TripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: trip } = await supabase
    .from("trips")
    .select("owner_id")
    .eq("id", id)
    .single();

  const isOwner = trip?.owner_id === user.id;

  const currentUser = {
    id: user.id,
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || "",
    avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
  };

  return <TripWorkspace tripId={id} currentUser={currentUser} isOwner={isOwner} />;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(protected)/trip/[id]/page.tsx
git commit -m "feat: pass current user and ownership to TripWorkspace from server"
```

---

## Task 13: Environment Variables & Final Verification

**Files:**
- Modify: `.env.local.example`

- [ ] **Step 1: Add GOOGLE_PLACES_API_KEY to env example**

Add the following line to `.env.local.example`:

```
GOOGLE_PLACES_API_KEY=your_google_places_api_key
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: No lint errors (or only pre-existing ones).

- [ ] **Step 4: Run dev server and verify**

Run: `pnpm dev`
Expected: App starts on http://localhost:3000 without errors.

Manual verification:
1. Open a trip workspace — header shows Discover (compass) and Members (users) icons
2. Click Members — panel opens, "Generate Link" creates a copyable invite URL
3. Click Discover — panel replaces itinerary, search shows place cards
4. Add a place from discovery to a day — it appears as a stop
5. Toggle "Show on map" — POI markers appear/disappear on the map

- [ ] **Step 5: Commit env changes**

```bash
git add .env.local.example
git commit -m "docs: add GOOGLE_PLACES_API_KEY to env example"
```

---

## Summary

| Task | What it builds |
|------|---------------|
| 1 | Database migration (invites table, RLS rewrite, realtime) |
| 2 | TypeScript types for new features |
| 3 | Server actions for invite CRUD |
| 4 | Invite acceptance page + middleware |
| 5 | Members panel UI |
| 6 | Presence avatars component |
| 7 | useRealtimeTrip hook |
| 8 | Google Places API routes |
| 9 | Discovery panel + place card |
| 10 | POI markers on map |
| 11 | Wire everything into TripWorkspace + TripHeader |
| 12 | Server-side user context for trip page |
| 13 | Env vars + verification |
