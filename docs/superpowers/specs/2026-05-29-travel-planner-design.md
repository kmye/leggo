# Leggo — Travel Planner Application

## Overview

A travel planner application that allows Chinese-speaking users to build day-by-day trip itineraries with map visualization. Uses Baidu Maps for China destinations and Mapbox for international destinations. Deployed on Vercel with Supabase as the backend.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14+ (App Router) |
| Hosting | Vercel |
| Auth | Supabase Auth (Google OAuth) |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage |
| Maps (China) | Baidu Maps JS API |
| Maps (International) | Mapbox GL JS |
| Styling | Tailwind CSS + shadcn/ui |

## Architecture

```
┌─────────────────────────────────────────────┐
│              Vercel (Hosting)                │
│  ┌───────────────────────────────────────┐  │
│  │       Next.js App Router              │  │
│  │  ┌─────────┐  ┌──────────────────┐   │  │
│  │  │  Pages  │  │  API Routes      │   │  │
│  │  │  (RSC)  │  │  (Server Actions) │   │  │
│  │  └─────────┘  └──────────────────┘   │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
         │                    │
    ┌────┴────┐          ┌───┴────┐
    │  Baidu  │          │Supabase│
    │  Maps   │          │        │
    │    +    │          │• Auth  │
    │ Mapbox  │          │• DB    │
    └─────────┘          │• Storage│
                         └────────┘
```

- **Server Components** for trip lists, dashboard — fast initial load, SEO-friendly share pages
- **Client Components** for the map view and itinerary editor — interactive, needs browser APIs
- **Supabase Auth** with Google OAuth provider — handles session management
- **Supabase Storage** for user-uploaded photos
- **Map provider switching** — detected by destination country, user can override

## Data Model

### users

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | From Supabase Auth |
| email | text | |
| name | text | |
| avatar_url | text | |
| created_at | timestamptz | |

### trips

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| owner_id | UUID | FK → users.id |
| title | text | |
| description | text | |
| status | enum | planning / active / completed |
| cover_image_url | text | nullable |
| share_token | UUID | nullable, for read-only links |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### trip_members (future: collaboration)

| Column | Type | Notes |
|--------|------|-------|
| trip_id | UUID | FK → trips.id |
| user_id | UUID | FK → users.id |
| role | enum | owner / editor / viewer |
| invited_at | timestamptz | |

### trip_days

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| trip_id | UUID | FK → trips.id |
| date | date | nullable (user might not have exact dates) |
| day_number | integer | for ordering |
| notes | text | |

### stops

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| day_id | UUID | FK → trip_days.id |
| order_index | integer | ordering within a day |
| name | text | |
| latitude | decimal | |
| longitude | decimal | |
| country_code | text | drives map provider switching |
| category | enum | food / sightseeing / hotel / transport / shopping / other |
| time_start | time | nullable |
| time_end | time | nullable |
| notes | text | |
| estimated_budget | decimal | nullable |
| currency | text | |
| links | JSONB | array of {label, url} |
| booking_references | JSONB | array of {provider, ref, url} |
| custom_fields | JSONB | array of {key, value} |
| created_at | timestamptz | |

### stop_photos

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| stop_id | UUID | FK → stops.id |
| storage_path | text | Supabase Storage reference |
| caption | text | nullable |
| order_index | integer | |
| uploaded_at | timestamptz | |

## Pages & Routes

```
/                       → Landing page (marketing + login CTA)
/dashboard              → User's trips list (planning/active/completed tabs)
/trip/new               → Create new trip form
/trip/[id]              → Trip workspace (main view)
/trip/[id]/share        → Public read-only view (no auth required)
/settings               → User profile/preferences
```

## UI Structure

### Main Workspace (`/trip/[id]`)

- **Left panel:** Day-by-day itinerary list (collapsible days, draggable stops)
- **Right panel:** Map showing all stops for the selected day(s)
- **Top bar:** Trip title, status badge, share button, settings
- **Add stop:** Click map to drop a pin, or search by name/address
- **Stop detail:** Slide-out drawer with all rich fields (time, notes, budget, photos, links, bookings, custom fields)

### Map Behavior

- Detects country from destination coordinates → loads Baidu or Mapbox
- If a trip spans both China and international stops, map provider is determined by the majority of stops in the selected day. User can manually toggle between providers via a button on the map.
- Pins connected by straight lines (phase 1), real routes later
- Color-coded pins by category

### Responsive Design

- Desktop: side-by-side panels (itinerary + map)
- Mobile: stacked/tab-switchable (itinerary list and map)

## Authentication & Authorization

### Auth Flow

1. User clicks "Sign in with Google"
2. Supabase Auth handles the OAuth flow
3. On success, session stored as HTTP-only cookie via `@supabase/ssr`

### Authorization (Row-Level Security)

- Users can only read/write their own trips
- `trip_members` entries grant access to other users' trips (future phase)
- Share token: anyone with the token can read trip data without auth

### Route Protection

- Middleware checks session on `/dashboard`, `/trip/*` routes (except share pages)
- Unauthenticated users redirected to landing page
- Share pages are fully public and server-rendered

## File Storage & Photos

### Supabase Storage

- Bucket: `stop-photos`
- Path: `{user_id}/{trip_id}/{stop_id}/{filename}`
- RLS mirrors trip ownership rules

### Upload Flow

1. User selects photos in stop detail drawer
2. Client-side resize/compress (target < 2MB)
3. Upload directly to Supabase Storage via signed URL
4. Create `stop_photos` row on success

### Limits

- Max 10 photos per stop
- Max 5MB per image
- Formats: JPEG, PNG, WebP

## Share Links

- Owner clicks "Share" → generates random `share_token` (UUID)
- URL: `/trip/[id]/share?token=abc123`
- Server-rendered, read-only view of full itinerary + map
- No login required
- Owner can revoke by regenerating or clearing the token

## Phased Delivery

### Phase 1 (This Build)

- Google OAuth login via Supabase
- Dashboard with trip CRUD and status management
- Trip workspace: day-by-day itinerary with draggable stops
- Map integration: Baidu (China) + Mapbox (international), visual pins + lines
- Rich stop details: time, notes, category, budget, photos, links, bookings, custom fields
- Photo upload to Supabase Storage
- Read-only share links
- Responsive (desktop + mobile)

### Phase 2 (Follow-up)

- Collaborative editing (invite users, real-time sync via Supabase Realtime)
- Trip discovery/inspiration (browse POIs, save favorites)

### Phase 3 (Future)

- Real route planning (driving/walking/transit between stops)
- Route optimization suggestions

### Out of Scope

- Booking/payment integration
- Offline mode
- Native mobile app
