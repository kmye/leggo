# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server (http://localhost:3000)
pnpm build        # Production build
pnpm lint         # ESLint
npx tsc --noEmit  # Type check without emitting
```

## Architecture

**Leggo** is a travel planner app — users create day-by-day trip itineraries with stops pinned on Google Maps. Deployed on Vercel, backed by Supabase (auth, PostgreSQL, file storage).

### Stack

- Next.js 16 (App Router, React 19, Turbopack)
- Supabase: Auth (Google OAuth), PostgreSQL (with RLS), Storage (photos)
- Google Maps via `@react-google-maps/api`
- Tailwind CSS + shadcn/ui (base-nova style)
- `@dnd-kit` for drag-and-drop stop reordering
- pnpm as package manager

### Route Structure

- `src/app/(auth)/` — login page and OAuth callback
- `src/app/(protected)/` — requires auth (dashboard, trip workspace, settings). Layout at `(protected)/layout.tsx` checks auth and redirects.
- `src/app/share/[id]/` — public read-only trip view (no auth, guarded by share token)
- `src/proxy.ts` — refreshes Supabase session, redirects unauthenticated users from protected routes to `/login`

### Key Patterns

**Supabase clients:** Two factories — `src/lib/supabase/client.ts` (browser, uses `createBrowserClient`) and `src/lib/supabase/server.ts` (server components/actions, uses `createServerClient` with cookie access). Never import the server client in `"use client"` files.

**Data flow for trip workspace:** The main trip page (`/trip/[id]`) is a thin server component that renders `TripWorkspace` (client). `TripWorkspace` uses `useTrip(tripId)` to fetch the full trip with nested days/stops/photos in one Supabase query, then distributes data to child components (ItineraryPanel, MapContainer, StopDrawer).

**Database schema:** Defined in `supabase/migrations/001_initial_schema.sql`. Row-Level Security enforces that users only access their own data. A `handle_new_user()` trigger auto-creates a profile row when a user signs up via auth.

**Map integration:** `MapContainer` renders `GoogleMapView` which uses `@react-google-maps/api`. Stops are shown as color-coded numbered markers connected by a polyline. Clicking the map opens the add-stop dialog.

### Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json).

### shadcn/ui

Add components with: `pnpm dlx shadcn@latest add <component-name>`

### Environment Variables

See `.env.local.example` — requires Supabase URL/anon key and Google Maps API key.
