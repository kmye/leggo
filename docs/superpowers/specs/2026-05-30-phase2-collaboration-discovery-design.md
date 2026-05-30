# Phase 2 — Collaborative Editing & Trip Discovery

## Overview

Phase 2 adds two features to Leggo:

1. **Collaborative editing** — invite users by email, role-based access (editor/viewer), real-time sync via Supabase Realtime (presence + live updates, last-write-wins)
2. **Trip discovery** — Google Places API search panel inside the trip workspace, allowing users to browse POIs and add them directly as stops

## Constraints & Decisions

- Real-time strategy: Supabase Realtime (Postgres Changes + Presence + Broadcast). No CRDT/OT — last-write-wins at row level.
- Invite mechanism: email invite links only (no in-app user search)
- POI source: Google Places API (server-side proxy to keep key secret)
- POI UX: integrated inside trip workspace, not a separate page
- POI markers: toggleable visibility on map to reduce clutter
- Access model: only trip owner and explicit members can see/access the trip workspace. Share links remain a separate read-only public view.

---

## 1. Collaborative Editing

### 1.1 Data Model Changes

#### New table: `trip_invites`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK, default uuid_generate_v4() |
| trip_id | UUID | FK → trips.id |
| inviter_id | UUID | FK → users.id |
| role | member_role | editor or viewer |
| token | UUID | unique, used in invite link URL |
| status | enum | pending / accepted / revoked |
| accepted_by | UUID | nullable, FK → users.id, set on acceptance |
| created_at | timestamptz | default now() |
| expires_at | timestamptz | 7 days from creation |

#### New enum: `invite_status`

```sql
create type invite_status as enum ('pending', 'accepted', 'revoked');
```

### 1.2 Access Control (RLS Rewrite)

#### Helper functions

```sql
user_can_access_trip(trip_id uuid) → boolean
-- Returns true if auth.uid() = trips.owner_id
-- OR exists in trip_members for that trip (any role)

user_can_edit_trip(trip_id uuid) → boolean
-- Returns true if auth.uid() = trips.owner_id
-- OR trip_members.role IN ('owner', 'editor')
```

#### Policy changes

All existing policies on `trips`, `trip_days`, `stops`, `stop_photos` are rewritten:

- **SELECT** on trips/days/stops/photos: `user_can_access_trip(trip_id)` OR share token match (for share page only)
- **INSERT/UPDATE/DELETE** on trips: owner only
- **INSERT/UPDATE/DELETE** on days/stops/photos: `user_can_edit_trip(trip_id)`
- **trip_members**: owner can manage (insert/delete). Members can read their own row.
- **trip_invites**: owner (inviter) can CRUD. Any authenticated user with the token can accept a pending, non-expired invite. Once accepted, the token is single-use — bound to `accepted_by` and cannot be reused by another user.

### 1.3 Invite Flow

1. Owner opens the members panel in trip settings and selects a role (editor/viewer)
2. Server action creates a `trip_invites` row with a unique token, sets `expires_at` to 7 days out
3. The invite link (`/invite/[token]`) is displayed in a copyable field. Owner shares it manually (via chat, email, etc.)
4. Recipient clicks link:
   - If logged in → server action validates token (must be pending, not expired), creates `trip_members` row, marks invite as accepted with `accepted_by` set to the user's ID, redirects to `/trip/[id]`
   - If not logged in → redirected to `/login?redirect=/invite/[token]`, then flow continues after auth
   - Token is single-use: once accepted, no other user can use it. Subsequent attempts return an error ("Invite already used").
5. Owner can see active invite links and revoke them from the members panel

### 1.4 Real-Time Sync

#### Channel: `trip:{tripId}`

Each `TripWorkspace` subscribes to one Supabase Realtime channel.

**Postgres Changes:**
- Listens for INSERT/UPDATE/DELETE on `trip_days`, `stops`, `stop_photos`, `trip_members` filtered by trip_id
- On INSERT: append to local state with highlight animation
- On UPDATE: merge changed fields into local state
- On DELETE: remove from local state with fade-out
- Changes originating from the current user are ignored (compare user_id in event payload)

**Presence:**
- State payload: `{user_id, name, avatar_url, current_stop_id}`
- `current_stop_id`: the stop the user has open in the drawer (null if none or if discovery panel is open)
- Displayed as avatar stack in trip header + subtle dot on stops being viewed by others

**Broadcast:**
- `typing:stop_notes` — sends when a user is actively typing in a stop's notes field. Other users see an "X is editing..." indicator on that stop card.

### 1.5 Hook: `useRealtimeTrip`

Wraps the existing `useTrip` hook and adds Realtime subscriptions:

```typescript
useRealtimeTrip(tripId: string) → {
  // everything from useTrip
  trip, loading, refetch, updateTrip, updateStatus, addDay, removeDay, generateShareToken, revokeShareToken,
  // new
  onlineMembers: {user_id: string, name: string, avatar_url: string, current_stop_id: string | null}[],
}
```

Lifecycle:
- Subscribes on mount
- Applies remote changes optimistically to local state (no full refetch)
- Unsubscribes on unmount

### 1.6 UI Changes

- **Trip header:** Avatar stack showing online members (max 3 visible + "+N" overflow)
- **Members panel:** Accessible from trip header dropdown. Shows:
  - Current members with role badges
  - Pending invites with "Revoke" button
  - "Invite" form (email input + role select + send button)
- **Stop cards:** Subtle colored dot when another user has that stop open
- **Stop drawer:** "X is editing..." text indicator when another user is typing in that stop's notes

---

## 2. Trip Discovery / POI Browsing

### 2.1 Data Model Changes

#### `trips` table additions

| Column | Type | Notes |
|--------|------|-------|
| destination_lat | decimal | nullable, for POI search centering |
| destination_lng | decimal | nullable |
| destination_name | text | nullable, display label (e.g., "Tokyo") |

No new tables — POIs are ephemeral search results. When added to a trip, they become regular `stops` rows.

### 2.2 API Routes

#### `POST /api/places/search`

- **Auth:** requires authenticated session + user must have access to the trip (trip_id passed for search centering context)
- **Request body:** `{query?: string, location: {lat, lng}, radius?: number, type?: string}`
- **Response:** `{places: [{place_id, name, lat, lng, address, rating, photo_url, types, opening_hours}]}`
- **Implementation:** calls Google Places Nearby Search (category browse) or Text Search (user query)
- **Caching:** server-side in-memory cache (15 min TTL) for identical search params

#### `GET /api/places/[placeId]`

- **Auth:** requires authenticated session
- **Response:** `{place_id, name, lat, lng, address, rating, photo_url, types, opening_hours, website, phone, reviews_summary}`
- **Implementation:** calls Google Places Details API

### 2.3 UI: Discovery Panel

A collapsible panel inside the workspace, toggled via a "Discover" button in the toolbar:

- **Search bar:** free text input with 300ms debounce
- **Category chips:** food, sightseeing, hotel, shopping, other — maps to Google Places types
- **Results list:** cards showing place name, star rating, photo thumbnail, short address
- **"Add to Day" button** on each card: dropdown of available days → inserts as a new stop at end of selected day with pre-filled name, coordinates, country_code, and mapped category
- **"Show on map" toggle** in panel header (on by default when panel is open):
  - On: discovered POIs appear as faded/outlined markers on the map (visually distinct from saved stops)
  - Off: POI markers hidden, results list still visible
- **Panel closed:** POI markers always hidden regardless of toggle state

### 2.4 Search Context

- Default search center: centroid of all existing stops in the trip
- If no stops exist: uses `destination_lat`/`destination_lng` from the trip. If those are also null, prompts user to set a destination city before searching.
- User can adjust search radius or pan the map to shift the search area

### 2.5 Rate Limiting

- Server-side cache prevents duplicate API calls (same params within 15 min)
- Client debounce (300ms) on search input
- No per-user rate limit — relies on Google Places API's own quotas
- If quota is exceeded, surface a user-friendly error: "Search temporarily unavailable, try again later"

---

## 3. Realtime Architecture & Feature Interactions

### 3.1 Channel Structure

One channel per trip: `trip:{tripId}`. Three subscription types (Postgres Changes, Presence, Broadcast) as described in Section 1.4.

### 3.2 Feature Interactions

- **Discovery + Collaboration:** When one user adds a POI as a stop, the Postgres Changes subscription broadcasts the INSERT to all other connected users. No special handling needed.
- **Discovery panel state is local:** Each user's search results, panel open/closed state, and POI marker toggle are independent per-client. No sync needed.
- **Presence + Discovery:** `current_stop_id` is null when a user has the discovery panel focused, avoiding confusion about what they're "looking at."

### 3.3 Permissions at Realtime Level

- Supabase Realtime delivers Postgres Changes events only for rows the user can SELECT (gated by RLS). Viewers see changes but cannot trigger writes.
- Channel-level authorization policy checks `trip_members` membership before allowing subscription.
- Places API routes verify the user has access to the trip before executing searches.

---

## 4. Migration Summary

New migration file adds:

1. `invite_status` enum
2. `trip_invites` table with indexes
3. `destination_lat`, `destination_lng`, `destination_name` columns on `trips`
4. `user_can_access_trip()` and `user_can_edit_trip()` helper functions
5. Rewritten RLS policies on all tables to use helper functions
6. RLS policies for `trip_invites`
7. Realtime publication: enable `supabase_realtime` publication for relevant tables

---

## 5. New Dependencies

| Package | Purpose |
|---------|---------|
| (none required) | Supabase Realtime is included in `@supabase/supabase-js`. Google Places calls are server-side fetch. |

No new npm dependencies needed.

New environment variables:
- `GOOGLE_PLACES_API_KEY` — may be the same as the existing Maps key or a separate restricted key

---

## 6. Out of Scope (Phase 2)

- In-app user search for invites
- CRDT/OT conflict resolution
- Cursor sharing on map
- POI favorites/collections
- Separate /explore page
- Real-time collaborative text editing (e.g., shared notes with cursor positions)
- Push notifications for invite acceptance
