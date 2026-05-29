# Leggo Travel Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a travel planner app where users create day-by-day trip itineraries with dual map support (Baidu Maps for China, Mapbox for international), Google OAuth via Supabase, and shareable read-only links.

**Architecture:** Next.js App Router with Server Components for data-fetching pages and Client Components for interactive map/editor views. Supabase provides auth, PostgreSQL database, and file storage. Map provider is selected per-day based on stop locations.

**Tech Stack:** Next.js 14+ (App Router), Supabase (Auth + DB + Storage), Baidu Maps JS API, Mapbox GL JS, Tailwind CSS, shadcn/ui, TypeScript

---

## File Structure

```
leggo/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout with providers
│   │   ├── page.tsx                      # Landing page
│   │   ├── globals.css                   # Tailwind + global styles
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx            # Login page with Google OAuth button
│   │   │   └── callback/route.ts         # Supabase OAuth callback handler
│   │   ├── (protected)/
│   │   │   ├── layout.tsx                # Auth-checking layout for protected routes
│   │   │   ├── dashboard/page.tsx        # Trip list with status tabs
│   │   │   ├── trip/
│   │   │   │   ├── new/page.tsx          # Create trip form
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx          # Trip workspace (main view)
│   │   │   │       └── loading.tsx       # Loading skeleton
│   │   │   └── settings/page.tsx         # User settings
│   │   └── share/
│   │       └── [id]/page.tsx             # Public read-only trip view
│   ├── components/
│   │   ├── ui/                           # shadcn/ui components (auto-generated)
│   │   ├── auth/
│   │   │   └── login-button.tsx          # Google OAuth login button
│   │   ├── dashboard/
│   │   │   ├── trip-card.tsx             # Trip card in dashboard list
│   │   │   └── trip-list.tsx             # Trip list with tabs
│   │   ├── trip/
│   │   │   ├── trip-workspace.tsx        # Main workspace container (client)
│   │   │   ├── itinerary-panel.tsx       # Left panel: day list + stops
│   │   │   ├── day-section.tsx           # Collapsible day with draggable stops
│   │   │   ├── stop-item.tsx             # Single stop in the list
│   │   │   ├── stop-drawer.tsx           # Slide-out stop detail editor
│   │   │   ├── stop-photos.tsx           # Photo upload/gallery in drawer
│   │   │   ├── add-stop-dialog.tsx       # Dialog for adding a stop (search/pin)
│   │   │   ├── trip-header.tsx           # Top bar: title, status, share
│   │   │   └── share-dialog.tsx          # Share link generation dialog
│   │   └── map/
│   │       ├── map-container.tsx         # Map wrapper (switches provider)
│   │       ├── baidu-map.tsx             # Baidu Maps implementation
│   │       ├── mapbox-map.tsx            # Mapbox implementation
│   │       └── map-provider-toggle.tsx   # Manual provider switch button
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                # Browser Supabase client
│   │   │   ├── server.ts                # Server-side Supabase client
│   │   │   └── middleware.ts            # Auth middleware helper
│   │   ├── map/
│   │   │   └── provider.ts             # Map provider detection logic
│   │   ├── types.ts                     # Shared TypeScript types
│   │   └── utils.ts                     # General utilities
│   ├── hooks/
│   │   ├── use-trip.ts                  # Trip data fetching/mutations
│   │   ├── use-stops.ts                 # Stop CRUD operations
│   │   └── use-photos.ts               # Photo upload/delete
│   └── middleware.ts                    # Next.js middleware (auth redirect)
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql       # Database schema + RLS policies
├── public/
│   └── ...                              # Static assets
├── .env.local.example                   # Environment variables template
├── next.config.ts                       # Next.js config
├── tailwind.config.ts                   # Tailwind config
├── tsconfig.json                        # TypeScript config
├── package.json                         # Dependencies
└── components.json                      # shadcn/ui config
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `.env.local.example`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

- [ ] **Step 1: Initialize Next.js project**

Run:
```bash
cd /Users/kmye/codes/fun-stuffs/leggo
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
```

Expected: Project scaffolded with Next.js, TypeScript, Tailwind, App Router, src directory.

- [ ] **Step 2: Install core dependencies**

Run:
```bash
pnpm add @supabase/supabase-js @supabase/ssr mapbox-gl @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities uuid
pnpm add -D @types/mapbox-gl @types/uuid supabase
```

- `@supabase/supabase-js`: Supabase client
- `@supabase/ssr`: Server-side Supabase for Next.js (cookie-based sessions)
- `mapbox-gl`: Mapbox GL JS for international maps
- `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`: Drag-and-drop for reordering stops
- `uuid`: Generate UUIDs for share tokens
- `supabase`: CLI for local development and migrations

- [ ] **Step 3: Initialize shadcn/ui**

Run:
```bash
pnpm dlx shadcn@latest init
```

When prompted:
- Style: Default
- Base color: Neutral
- CSS variables: Yes

Then install commonly needed components:
```bash
pnpm dlx shadcn@latest add button card dialog drawer input label select tabs textarea badge dropdown-menu separator skeleton toast
```

- [ ] **Step 4: Create environment variables template**

Create `.env.local.example`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Baidu Maps
NEXT_PUBLIC_BAIDU_MAP_AK=your-baidu-map-key

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token
```

- [ ] **Step 5: Initialize git and commit**

Run:
```bash
git init
git add .
git commit -m "chore: scaffold Next.js project with dependencies"
```

---

## Task 2: Supabase Schema & RLS Policies

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Initialize Supabase locally**

Run:
```bash
pnpm supabase init
```

- [ ] **Step 2: Write the database migration**

Create `supabase/migrations/001_initial_schema.sql`:
```sql
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
```

- [ ] **Step 3: Commit**

Run:
```bash
git add supabase/
git commit -m "feat: add database schema with RLS policies"
```

---

## Task 3: Supabase Client Setup & Auth Middleware

**Files:**
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`, `src/middleware.ts`

- [ ] **Step 1: Create browser Supabase client**

Create `src/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 2: Create server Supabase client**

Create `src/lib/supabase/server.ts`:
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component — ignore
          }
        },
      },
    }
  );
}
```

- [ ] **Step 3: Create middleware helper**

Create `src/lib/supabase/middleware.ts`:
```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtectedRoute = request.nextUrl.pathname.startsWith("/dashboard") ||
    (request.nextUrl.pathname.startsWith("/trip") && !request.nextUrl.pathname.includes("/share"));

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

- [ ] **Step 4: Create Next.js middleware**

Create `src/middleware.ts`:
```typescript
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 5: Commit**

Run:
```bash
git add src/lib/supabase/ src/middleware.ts
git commit -m "feat: add Supabase client setup and auth middleware"
```

---

## Task 4: TypeScript Types

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Define all shared types**

Create `src/lib/types.ts`:
```typescript
export type TripStatus = "planning" | "active" | "completed";
export type MemberRole = "owner" | "editor" | "viewer";
export type StopCategory = "food" | "sightseeing" | "hotel" | "transport" | "shopping" | "other";
export type MapProvider = "baidu" | "mapbox";

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Trip {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  status: TripStatus;
  cover_image_url: string | null;
  share_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripWithDays extends Trip {
  trip_days: DayWithStops[];
}

export interface TripMember {
  trip_id: string;
  user_id: string;
  role: MemberRole;
  invited_at: string;
}

export interface TripDay {
  id: string;
  trip_id: string;
  date: string | null;
  day_number: number;
  notes: string;
}

export interface DayWithStops extends TripDay {
  stops: StopWithPhotos[];
}

export interface Stop {
  id: string;
  day_id: string;
  order_index: number;
  name: string;
  latitude: number;
  longitude: number;
  country_code: string;
  category: StopCategory;
  time_start: string | null;
  time_end: string | null;
  notes: string;
  estimated_budget: number | null;
  currency: string;
  links: StopLink[];
  booking_references: BookingReference[];
  custom_fields: CustomField[];
  created_at: string;
}

export interface StopWithPhotos extends Stop {
  stop_photos: StopPhoto[];
}

export interface StopLink {
  label: string;
  url: string;
}

export interface BookingReference {
  provider: string;
  ref: string;
  url: string;
}

export interface CustomField {
  key: string;
  value: string;
}

export interface StopPhoto {
  id: string;
  stop_id: string;
  storage_path: string;
  caption: string | null;
  order_index: number;
  uploaded_at: string;
}
```

- [ ] **Step 2: Commit**

Run:
```bash
git add src/lib/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 5: Authentication (Login + Callback)

**Files:**
- Create: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/callback/route.ts`, `src/components/auth/login-button.tsx`

- [ ] **Step 1: Create Google OAuth login button**

Create `src/components/auth/login-button.tsx`:
```typescript
"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function LoginButton() {
  const handleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    });
  };

  return (
    <Button onClick={handleLogin} size="lg" className="w-full max-w-sm">
      Sign in with Google
    </Button>
  );
}
```

- [ ] **Step 2: Create login page**

Create `src/app/(auth)/login/page.tsx`:
```typescript
import { LoginButton } from "@/components/auth/login-button";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="mx-auto flex w-full flex-col items-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Leggo</h1>
          <p className="text-sm text-muted-foreground">
            Plan your trips, one stop at a time
          </p>
        </div>
        <LoginButton />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create OAuth callback handler**

Create `src/app/(auth)/callback/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
```

- [ ] **Step 4: Verify the login flow compiles**

Run:
```bash
pnpm build
```

Expected: Build succeeds without errors.

- [ ] **Step 5: Commit**

Run:
```bash
git add src/app/\(auth\)/ src/components/auth/
git commit -m "feat: add Google OAuth login flow"
```

---

## Task 6: Protected Layout & Dashboard

**Files:**
- Create: `src/app/(protected)/layout.tsx`, `src/app/(protected)/dashboard/page.tsx`, `src/components/dashboard/trip-card.tsx`, `src/components/dashboard/trip-list.tsx`

- [ ] **Step 1: Create protected route layout**

Create `src/app/(protected)/layout.tsx`:
```typescript
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: Create trip card component**

Create `src/components/dashboard/trip-card.tsx`:
```typescript
"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Trip } from "@/lib/types";

const statusColors: Record<string, string> = {
  planning: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
};

export function TripCard({ trip }: { trip: Trip }) {
  return (
    <Link href={`/trip/${trip.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{trip.title}</CardTitle>
            <Badge className={statusColors[trip.status]}>{trip.status}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {trip.description || "No description"}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Updated {new Date(trip.updated_at).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 3: Create trip list with tabs**

Create `src/components/dashboard/trip-list.tsx`:
```typescript
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TripCard } from "./trip-card";
import type { Trip, TripStatus } from "@/lib/types";

export function TripList({ trips }: { trips: Trip[] }) {
  const filterByStatus = (status: TripStatus) =>
    trips.filter((t) => t.status === status);

  return (
    <Tabs defaultValue="all">
      <TabsList>
        <TabsTrigger value="all">All ({trips.length})</TabsTrigger>
        <TabsTrigger value="planning">
          Planning ({filterByStatus("planning").length})
        </TabsTrigger>
        <TabsTrigger value="active">
          Active ({filterByStatus("active").length})
        </TabsTrigger>
        <TabsTrigger value="completed">
          Completed ({filterByStatus("completed").length})
        </TabsTrigger>
      </TabsList>
      <TabsContent value="all" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
        {trips.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
        {trips.length === 0 && (
          <p className="text-muted-foreground col-span-full text-center py-8">
            No trips yet. Create your first one!
          </p>
        )}
      </TabsContent>
      {(["planning", "active", "completed"] as TripStatus[]).map((status) => (
        <TabsContent key={status} value={status} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
          {filterByStatus(status).map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
          {filterByStatus(status).length === 0 && (
            <p className="text-muted-foreground col-span-full text-center py-8">
              No {status} trips.
            </p>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
```

- [ ] **Step 4: Create dashboard page**

Create `src/app/(protected)/dashboard/page.tsx`:
```typescript
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TripList } from "@/components/dashboard/trip-list";
import { Button } from "@/components/ui/button";
import type { Trip } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: trips } = await supabase
    .from("trips")
    .select("*")
    .order("updated_at", { ascending: false });

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Trips</h1>
        <Link href="/trip/new">
          <Button>New Trip</Button>
        </Link>
      </div>
      <TripList trips={(trips as Trip[]) || []} />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

Run:
```bash
git add src/app/\(protected\)/ src/components/dashboard/
git commit -m "feat: add protected layout and dashboard with trip list"
```

---

## Task 7: Create Trip Page

**Files:**
- Create: `src/app/(protected)/trip/new/page.tsx`

- [ ] **Step 1: Create the new trip form page**

Create `src/app/(protected)/trip/new/page.tsx`:
```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function NewTripPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: trip, error } = await supabase
      .from("trips")
      .insert({
        owner_id: user.id,
        title,
        description,
        status: "planning",
      })
      .select()
      .single();

    if (error) {
      setLoading(false);
      return;
    }

    // Create first day automatically
    await supabase.from("trip_days").insert({
      trip_id: trip.id,
      day_number: 1,
      notes: "",
    });

    router.push(`/trip/${trip.id}`);
  };

  return (
    <div className="container mx-auto max-w-lg py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Create New Trip</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Trip Title</Label>
          <Input
            id="title"
            name="title"
            placeholder="e.g. Beijing Weekend Getaway"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            name="description"
            placeholder="What's this trip about?"
            rows={3}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating..." : "Create Trip"}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

Run:
```bash
git add src/app/\(protected\)/trip/new/
git commit -m "feat: add create trip page"
```

---

## Task 8: Trip Data Hooks

**Files:**
- Create: `src/hooks/use-trip.ts`, `src/hooks/use-stops.ts`

- [ ] **Step 1: Create trip data hook**

Create `src/hooks/use-trip.ts`:
```typescript
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TripWithDays, TripDay, TripStatus } from "@/lib/types";

export function useTrip(tripId: string) {
  const [trip, setTrip] = useState<TripWithDays | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchTrip = useCallback(async () => {
    const { data } = await supabase
      .from("trips")
      .select(`
        *,
        trip_days (
          *,
          stops (
            *,
            stop_photos (*)
          )
        )
      `)
      .eq("id", tripId)
      .single();

    if (data) {
      const sorted = {
        ...data,
        trip_days: data.trip_days
          .sort((a: TripDay, b: TripDay) => a.day_number - b.day_number)
          .map((day: TripDay & { stops: any[] }) => ({
            ...day,
            stops: day.stops.sort((a, b) => a.order_index - b.order_index),
          })),
      };
      setTrip(sorted as TripWithDays);
    }
    setLoading(false);
  }, [tripId, supabase]);

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  const updateTrip = async (updates: Partial<TripWithDays>) => {
    const { error } = await supabase
      .from("trips")
      .update(updates)
      .eq("id", tripId);

    if (!error) {
      setTrip((prev) => (prev ? { ...prev, ...updates } : null));
    }
    return { error };
  };

  const updateStatus = async (status: TripStatus) => {
    return updateTrip({ status });
  };

  const addDay = async () => {
    const nextNumber = trip ? trip.trip_days.length + 1 : 1;
    const { data, error } = await supabase
      .from("trip_days")
      .insert({ trip_id: tripId, day_number: nextNumber, notes: "" })
      .select()
      .single();

    if (!error && data) {
      setTrip((prev) =>
        prev
          ? { ...prev, trip_days: [...prev.trip_days, { ...data, stops: [] }] }
          : null
      );
    }
    return { data, error };
  };

  const removeDay = async (dayId: string) => {
    const { error } = await supabase
      .from("trip_days")
      .delete()
      .eq("id", dayId);

    if (!error) {
      setTrip((prev) =>
        prev
          ? {
              ...prev,
              trip_days: prev.trip_days
                .filter((d) => d.id !== dayId)
                .map((d, i) => ({ ...d, day_number: i + 1 })),
            }
          : null
      );
    }
    return { error };
  };

  const generateShareToken = async () => {
    const token = crypto.randomUUID();
    const { error } = await supabase
      .from("trips")
      .update({ share_token: token })
      .eq("id", tripId);

    if (!error) {
      setTrip((prev) => (prev ? { ...prev, share_token: token } : null));
    }
    return { token, error };
  };

  const revokeShareToken = async () => {
    const { error } = await supabase
      .from("trips")
      .update({ share_token: null })
      .eq("id", tripId);

    if (!error) {
      setTrip((prev) => (prev ? { ...prev, share_token: null } : null));
    }
    return { error };
  };

  return {
    trip,
    loading,
    refetch: fetchTrip,
    updateTrip,
    updateStatus,
    addDay,
    removeDay,
    generateShareToken,
    revokeShareToken,
  };
}
```

- [ ] **Step 2: Create stops hook**

Create `src/hooks/use-stops.ts`:
```typescript
"use client";

import { createClient } from "@/lib/supabase/client";
import type { Stop, StopWithPhotos } from "@/lib/types";

export function useStops() {
  const supabase = createClient();

  const addStop = async (
    dayId: string,
    stop: Omit<Stop, "id" | "day_id" | "created_at">
  ) => {
    const { data, error } = await supabase
      .from("stops")
      .insert({ ...stop, day_id: dayId })
      .select("*, stop_photos(*)")
      .single();

    return { data: data as StopWithPhotos | null, error };
  };

  const updateStop = async (stopId: string, updates: Partial<Stop>) => {
    const { data, error } = await supabase
      .from("stops")
      .update(updates)
      .eq("id", stopId)
      .select("*, stop_photos(*)")
      .single();

    return { data: data as StopWithPhotos | null, error };
  };

  const deleteStop = async (stopId: string) => {
    const { error } = await supabase.from("stops").delete().eq("id", stopId);
    return { error };
  };

  const reorderStops = async (
    dayId: string,
    stopIds: string[]
  ) => {
    const updates = stopIds.map((id, index) => ({
      id,
      day_id: dayId,
      order_index: index,
    }));

    const promises = updates.map(({ id, order_index }) =>
      supabase.from("stops").update({ order_index }).eq("id", id)
    );

    const results = await Promise.all(promises);
    const error = results.find((r) => r.error)?.error;
    return { error };
  };

  const moveStopToDay = async (
    stopId: string,
    newDayId: string,
    newOrderIndex: number
  ) => {
    const { error } = await supabase
      .from("stops")
      .update({ day_id: newDayId, order_index: newOrderIndex })
      .eq("id", stopId);

    return { error };
  };

  return { addStop, updateStop, deleteStop, reorderStops, moveStopToDay };
}
```

- [ ] **Step 3: Commit**

Run:
```bash
git add src/hooks/
git commit -m "feat: add trip and stops data hooks"
```

---

## Task 9: Map Provider Logic

**Files:**
- Create: `src/lib/map/provider.ts`

- [ ] **Step 1: Create map provider detection**

Create `src/lib/map/provider.ts`:
```typescript
import type { MapProvider, StopWithPhotos } from "@/lib/types";

const CHINA_COUNTRY_CODE = "CN";

export function detectMapProvider(stops: StopWithPhotos[]): MapProvider {
  if (stops.length === 0) return "baidu";

  const chinaStops = stops.filter((s) => s.country_code === CHINA_COUNTRY_CODE);
  const ratio = chinaStops.length / stops.length;

  return ratio >= 0.5 ? "baidu" : "mapbox";
}

export function getProviderForCountry(countryCode: string): MapProvider {
  return countryCode === CHINA_COUNTRY_CODE ? "baidu" : "mapbox";
}
```

- [ ] **Step 2: Commit**

Run:
```bash
git add src/lib/map/
git commit -m "feat: add map provider detection logic"
```

---

## Task 10: Map Components

**Files:**
- Create: `src/components/map/map-container.tsx`, `src/components/map/baidu-map.tsx`, `src/components/map/mapbox-map.tsx`, `src/components/map/map-provider-toggle.tsx`

- [ ] **Step 1: Create Mapbox map component**

Create `src/components/map/mapbox-map.tsx`:
```typescript
"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { StopWithPhotos, StopCategory } from "@/lib/types";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const categoryColors: Record<StopCategory, string> = {
  food: "#ef4444",
  sightseeing: "#3b82f6",
  hotel: "#8b5cf6",
  transport: "#6b7280",
  shopping: "#f59e0b",
  other: "#10b981",
};

interface MapboxMapProps {
  stops: StopWithPhotos[];
  selectedStopId: string | null;
  onStopClick: (stopId: string) => void;
  onMapClick: (lat: number, lng: number) => void;
}

export function MapboxMap({
  stops,
  selectedStopId,
  onStopClick,
  onMapClick,
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: stops.length > 0 ? [stops[0].longitude, stops[0].latitude] : [104.0, 35.0],
      zoom: stops.length > 0 ? 12 : 4,
    });

    map.current.addControl(new mapboxgl.NavigationControl());

    map.current.on("click", (e) => {
      onMapClick(e.lngLat.lat, e.lngLat.lng);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;

    markers.current.forEach((m) => m.remove());
    markers.current = [];

    stops.forEach((stop, index) => {
      const el = document.createElement("div");
      el.className = "w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold cursor-pointer";
      el.style.backgroundColor = categoryColors[stop.category];
      el.textContent = String(index + 1);

      if (stop.id === selectedStopId) {
        el.style.transform = "scale(1.3)";
        el.style.borderColor = "#000";
      }

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onStopClick(stop.id);
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([stop.longitude, stop.latitude])
        .addTo(map.current!);

      markers.current.push(marker);
    });

    // Draw lines between stops
    const sourceId = "route-line";
    if (map.current.getSource(sourceId)) {
      (map.current.getSource(sourceId) as mapboxgl.GeoJSONSource).setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: stops.map((s) => [s.longitude, s.latitude]),
        },
      });
    } else if (stops.length >= 2) {
      map.current.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: stops.map((s) => [s.longitude, s.latitude]),
          },
        },
      });
      map.current.addLayer({
        id: "route-line-layer",
        type: "line",
        source: sourceId,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#6366f1", "line-width": 2, "line-dasharray": [2, 2] },
      });
    }

    // Fit bounds if stops exist
    if (stops.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      stops.forEach((s) => bounds.extend([s.longitude, s.latitude]));
      map.current.fitBounds(bounds, { padding: 60, maxZoom: 15 });
    }
  }, [stops, selectedStopId, onStopClick]);

  return <div ref={mapContainer} className="w-full h-full" />;
}
```

- [ ] **Step 2: Create Baidu map component**

Create `src/components/map/baidu-map.tsx`:
```typescript
"use client";

import { useEffect, useRef } from "react";
import type { StopWithPhotos, StopCategory } from "@/lib/types";

declare global {
  interface Window {
    BMapGL: any;
    initBaiduMap: () => void;
  }
}

const categoryColors: Record<StopCategory, string> = {
  food: "#ef4444",
  sightseeing: "#3b82f6",
  hotel: "#8b5cf6",
  transport: "#6b7280",
  shopping: "#f59e0b",
  other: "#10b981",
};

interface BaiduMapProps {
  stops: StopWithPhotos[];
  selectedStopId: string | null;
  onStopClick: (stopId: string) => void;
  onMapClick: (lat: number, lng: number) => void;
}

function loadBaiduScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.BMapGL) {
      resolve();
      return;
    }
    window.initBaiduMap = () => resolve();
    const script = document.createElement("script");
    script.src = `https://api.map.baidu.com/api?v=1.0&type=webgl&ak=${process.env.NEXT_PUBLIC_BAIDU_MAP_AK}&callback=initBaiduMap`;
    document.head.appendChild(script);
  });
}

export function BaiduMap({
  stops,
  selectedStopId,
  onStopClick,
  onMapClick,
}: BaiduMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    let mounted = true;

    loadBaiduScript().then(() => {
      if (!mounted || !mapContainer.current || map.current) return;

      const BMapGL = window.BMapGL;
      const center = stops.length > 0
        ? new BMapGL.Point(stops[0].longitude, stops[0].latitude)
        : new BMapGL.Point(116.404, 39.915);

      map.current = new BMapGL.Map(mapContainer.current);
      map.current.centerAndZoom(center, stops.length > 0 ? 13 : 5);
      map.current.enableScrollWheelZoom(true);
      map.current.addControl(new BMapGL.NavigationControl());

      map.current.addEventListener("click", (e: any) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    });

    return () => {
      mounted = false;
      if (map.current) {
        map.current.destroy();
        map.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!map.current || !window.BMapGL) return;

    const BMapGL = window.BMapGL;

    markersRef.current.forEach((m) => map.current.removeOverlay(m));
    markersRef.current = [];

    stops.forEach((stop, index) => {
      const point = new BMapGL.Point(stop.longitude, stop.latitude);
      const marker = new BMapGL.Marker(point, {
        icon: new BMapGL.Symbol("CIRCLE", {
          scale: stop.id === selectedStopId ? 12 : 10,
          strokeWeight: 2,
          strokeColor: "#ffffff",
          fillColor: categoryColors[stop.category],
          fillOpacity: 1,
        }),
      });

      const label = new BMapGL.Label(String(index + 1), {
        position: point,
        offset: new BMapGL.Size(-4, -10),
      });
      label.setStyle({
        color: "#fff",
        fontSize: "12px",
        backgroundColor: "transparent",
        border: "none",
      });

      marker.addEventListener("click", () => onStopClick(stop.id));
      map.current.addOverlay(marker);
      map.current.addOverlay(label);
      markersRef.current.push(marker, label);
    });

    // Draw lines
    if (stops.length >= 2) {
      const points = stops.map((s) => new BMapGL.Point(s.longitude, s.latitude));
      const polyline = new BMapGL.Polyline(points, {
        strokeColor: "#6366f1",
        strokeWeight: 2,
        strokeStyle: "dashed",
      });
      map.current.addOverlay(polyline);
      markersRef.current.push(polyline);
    }

    // Fit viewport
    if (stops.length > 0) {
      const points = stops.map((s) => new BMapGL.Point(s.longitude, s.latitude));
      const viewport = map.current.getViewport(points);
      map.current.centerAndZoom(viewport.center, viewport.zoom);
    }
  }, [stops, selectedStopId, onStopClick]);

  return <div ref={mapContainer} className="w-full h-full" />;
}
```

- [ ] **Step 3: Create map provider toggle**

Create `src/components/map/map-provider-toggle.tsx`:
```typescript
"use client";

import { Button } from "@/components/ui/button";
import type { MapProvider } from "@/lib/types";

interface MapProviderToggleProps {
  current: MapProvider;
  onToggle: (provider: MapProvider) => void;
}

export function MapProviderToggle({ current, onToggle }: MapProviderToggleProps) {
  return (
    <div className="absolute top-2 right-2 z-10">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onToggle(current === "baidu" ? "mapbox" : "baidu")}
      >
        {current === "baidu" ? "Switch to Mapbox" : "Switch to Baidu"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Create map container (provider switcher)**

Create `src/components/map/map-container.tsx`:
```typescript
"use client";

import { useState } from "react";
import { MapboxMap } from "./mapbox-map";
import { BaiduMap } from "./baidu-map";
import { MapProviderToggle } from "./map-provider-toggle";
import { detectMapProvider } from "@/lib/map/provider";
import type { MapProvider, StopWithPhotos } from "@/lib/types";

interface MapContainerProps {
  stops: StopWithPhotos[];
  selectedStopId: string | null;
  onStopClick: (stopId: string) => void;
  onMapClick: (lat: number, lng: number) => void;
}

export function MapContainer({
  stops,
  selectedStopId,
  onStopClick,
  onMapClick,
}: MapContainerProps) {
  const detected = detectMapProvider(stops);
  const [provider, setProvider] = useState<MapProvider>(detected);

  return (
    <div className="relative w-full h-full">
      <MapProviderToggle current={provider} onToggle={setProvider} />
      {provider === "mapbox" ? (
        <MapboxMap
          stops={stops}
          selectedStopId={selectedStopId}
          onStopClick={onStopClick}
          onMapClick={onMapClick}
        />
      ) : (
        <BaiduMap
          stops={stops}
          selectedStopId={selectedStopId}
          onStopClick={onStopClick}
          onMapClick={onMapClick}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

Run:
```bash
git add src/components/map/ src/lib/map/
git commit -m "feat: add dual map components (Baidu + Mapbox) with provider switching"
```

---

## Task 11: Trip Workspace — Itinerary Panel

**Files:**
- Create: `src/components/trip/itinerary-panel.tsx`, `src/components/trip/day-section.tsx`, `src/components/trip/stop-item.tsx`

- [ ] **Step 1: Create stop item component**

Create `src/components/trip/stop-item.tsx`:
```typescript
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import type { StopWithPhotos, StopCategory } from "@/lib/types";

const categoryLabels: Record<StopCategory, string> = {
  food: "Food",
  sightseeing: "Sightseeing",
  hotel: "Hotel",
  transport: "Transport",
  shopping: "Shopping",
  other: "Other",
};

const categoryColors: Record<StopCategory, string> = {
  food: "bg-red-100 text-red-700",
  sightseeing: "bg-blue-100 text-blue-700",
  hotel: "bg-purple-100 text-purple-700",
  transport: "bg-gray-100 text-gray-700",
  shopping: "bg-amber-100 text-amber-700",
  other: "bg-green-100 text-green-700",
};

interface StopItemProps {
  stop: StopWithPhotos;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}

export function StopItem({ stop, index, isSelected, onClick }: StopItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: stop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`p-3 rounded-md border cursor-pointer transition-colors ${
        isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
      }`}
    >
      <div className="flex items-start gap-2">
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{stop.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className={`text-xs ${categoryColors[stop.category]}`}>
              {categoryLabels[stop.category]}
            </Badge>
            {stop.time_start && (
              <span className="text-xs text-muted-foreground">
                {stop.time_start}
                {stop.time_end && ` - ${stop.time_end}`}
              </span>
            )}
          </div>
          {stop.estimated_budget && (
            <p className="text-xs text-muted-foreground mt-1">
              {stop.currency} {stop.estimated_budget}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create day section component**

Create `src/components/trip/day-section.tsx`:
```typescript
"use client";

import { useState } from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { StopItem } from "./stop-item";
import { Button } from "@/components/ui/button";
import type { DayWithStops } from "@/lib/types";

interface DaySectionProps {
  day: DayWithStops;
  selectedStopId: string | null;
  onStopClick: (stopId: string) => void;
  onAddStop: (dayId: string) => void;
  onRemoveDay: (dayId: string) => void;
}

export function DaySection({
  day,
  selectedStopId,
  onStopClick,
  onAddStop,
  onRemoveDay,
}: DaySectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-2 bg-muted/50 cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            Day {day.day_number}
          </span>
          {day.date && (
            <span className="text-xs text-muted-foreground">
              ({day.date})
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {day.stops.length} stop{day.stops.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveDay(day.id);
            }}
          >
            Remove
          </Button>
          <span className="text-muted-foreground text-xs">
            {collapsed ? "+" : "-"}
          </span>
        </div>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-2">
          <SortableContext
            items={day.stops.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {day.stops.map((stop, index) => (
              <StopItem
                key={stop.id}
                stop={stop}
                index={index}
                isSelected={stop.id === selectedStopId}
                onClick={() => onStopClick(stop.id)}
              />
            ))}
          </SortableContext>
          {day.stops.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No stops yet
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onAddStop(day.id)}
          >
            + Add Stop
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create itinerary panel**

Create `src/components/trip/itinerary-panel.tsx`:
```typescript
"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { DaySection } from "./day-section";
import { Button } from "@/components/ui/button";
import type { DayWithStops } from "@/lib/types";

interface ItineraryPanelProps {
  days: DayWithStops[];
  selectedStopId: string | null;
  onStopClick: (stopId: string) => void;
  onAddStop: (dayId: string) => void;
  onAddDay: () => void;
  onRemoveDay: (dayId: string) => void;
  onReorderStops: (dayId: string, stopIds: string[]) => void;
}

export function ItineraryPanel({
  days,
  selectedStopId,
  onStopClick,
  onAddStop,
  onAddDay,
  onRemoveDay,
  onReorderStops,
}: ItineraryPanelProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    for (const day of days) {
      const stopIds = day.stops.map((s) => s.id);
      const oldIndex = stopIds.indexOf(active.id as string);
      const newIndex = stopIds.indexOf(over.id as string);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = [...stopIds];
        newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, active.id as string);
        onReorderStops(day.id, newOrder);
        break;
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          {days.map((day) => (
            <DaySection
              key={day.id}
              day={day}
              selectedStopId={selectedStopId}
              onStopClick={onStopClick}
              onAddStop={onAddStop}
              onRemoveDay={onRemoveDay}
            />
          ))}
        </DndContext>
      </div>
      <div className="p-4 border-t">
        <Button variant="outline" className="w-full" onClick={onAddDay}>
          + Add Day
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

Run:
```bash
git add src/components/trip/stop-item.tsx src/components/trip/day-section.tsx src/components/trip/itinerary-panel.tsx
git commit -m "feat: add itinerary panel with draggable stops and day sections"
```

---

## Task 12: Stop Detail Drawer

**Files:**
- Create: `src/components/trip/stop-drawer.tsx`

- [ ] **Step 1: Create stop detail drawer**

Create `src/components/trip/stop-drawer.tsx`:
```typescript
"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { StopWithPhotos, StopCategory, StopLink, BookingReference, CustomField } from "@/lib/types";

interface StopDrawerProps {
  stop: StopWithPhotos | null;
  open: boolean;
  onClose: () => void;
  onSave: (stopId: string, updates: Partial<StopWithPhotos>) => void;
  onDelete: (stopId: string) => void;
}

export function StopDrawer({ stop, open, onClose, onSave, onDelete }: StopDrawerProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<StopCategory>("other");
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("CNY");
  const [links, setLinks] = useState<StopLink[]>([]);
  const [bookings, setBookings] = useState<BookingReference[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  useEffect(() => {
    if (stop) {
      setName(stop.name);
      setCategory(stop.category);
      setTimeStart(stop.time_start || "");
      setTimeEnd(stop.time_end || "");
      setNotes(stop.notes);
      setBudget(stop.estimated_budget?.toString() || "");
      setCurrency(stop.currency);
      setLinks(stop.links);
      setBookings(stop.booking_references);
      setCustomFields(stop.custom_fields);
    }
  }, [stop]);

  const handleSave = () => {
    if (!stop) return;
    onSave(stop.id, {
      name,
      category,
      time_start: timeStart || null,
      time_end: timeEnd || null,
      notes,
      estimated_budget: budget ? parseFloat(budget) : null,
      currency,
      links,
      booking_references: bookings,
      custom_fields: customFields,
    });
    onClose();
  };

  const addLink = () => setLinks([...links, { label: "", url: "" }]);
  const updateLink = (i: number, field: keyof StopLink, value: string) => {
    const updated = [...links];
    updated[i] = { ...updated[i], [field]: value };
    setLinks(updated);
  };
  const removeLink = (i: number) => setLinks(links.filter((_, idx) => idx !== i));

  const addBooking = () => setBookings([...bookings, { provider: "", ref: "", url: "" }]);
  const updateBooking = (i: number, field: keyof BookingReference, value: string) => {
    const updated = [...bookings];
    updated[i] = { ...updated[i], [field]: value };
    setBookings(updated);
  };
  const removeBooking = (i: number) => setBookings(bookings.filter((_, idx) => idx !== i));

  const addCustomField = () => setCustomFields([...customFields, { key: "", value: "" }]);
  const updateCustomField = (i: number, field: keyof CustomField, value: string) => {
    const updated = [...customFields];
    updated[i] = { ...updated[i], [field]: value };
    setCustomFields(updated);
  };
  const removeCustomField = (i: number) => setCustomFields(customFields.filter((_, idx) => idx !== i));

  if (!stop) return null;

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>Edit Stop</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-4 space-y-4">
          {/* Basic Info */}
          <div className="space-y-2">
            <Label htmlFor="stop-name">Name</Label>
            <Input id="stop-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as StopCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="food">Food</SelectItem>
                <SelectItem value="sightseeing">Sightseeing</SelectItem>
                <SelectItem value="hotel">Hotel</SelectItem>
                <SelectItem value="transport">Transport</SelectItem>
                <SelectItem value="shopping">Shopping</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input type="time" value={timeStart} onChange={(e) => setTimeStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>

          {/* Budget */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-2">
              <Label>Budget</Label>
              <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </div>
          </div>

          <Separator />

          {/* Links */}
          <div className="space-y-2">
            <Label>Links</Label>
            {links.map((link, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="Label" value={link.label} onChange={(e) => updateLink(i, "label", e.target.value)} className="flex-1" />
                <Input placeholder="URL" value={link.url} onChange={(e) => updateLink(i, "url", e.target.value)} className="flex-1" />
                <Button variant="ghost" size="sm" onClick={() => removeLink(i)}>x</Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addLink}>+ Add Link</Button>
          </div>

          <Separator />

          {/* Booking References */}
          <div className="space-y-2">
            <Label>Booking References</Label>
            {bookings.map((b, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="Provider" value={b.provider} onChange={(e) => updateBooking(i, "provider", e.target.value)} className="flex-1" />
                <Input placeholder="Ref #" value={b.ref} onChange={(e) => updateBooking(i, "ref", e.target.value)} className="flex-1" />
                <Input placeholder="URL" value={b.url} onChange={(e) => updateBooking(i, "url", e.target.value)} className="flex-1" />
                <Button variant="ghost" size="sm" onClick={() => removeBooking(i)}>x</Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addBooking}>+ Add Booking</Button>
          </div>

          <Separator />

          {/* Custom Fields */}
          <div className="space-y-2">
            <Label>Custom Fields</Label>
            {customFields.map((cf, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="Key" value={cf.key} onChange={(e) => updateCustomField(i, "key", e.target.value)} className="flex-1" />
                <Input placeholder="Value" value={cf.value} onChange={(e) => updateCustomField(i, "value", e.target.value)} className="flex-1" />
                <Button variant="ghost" size="sm" onClick={() => removeCustomField(i)}>x</Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addCustomField}>+ Add Field</Button>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1">Save</Button>
            <Button
              variant="destructive"
              onClick={() => { onDelete(stop.id); onClose(); }}
            >
              Delete
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
```

- [ ] **Step 2: Commit**

Run:
```bash
git add src/components/trip/stop-drawer.tsx
git commit -m "feat: add stop detail drawer with all rich fields"
```

---

## Task 13: Add Stop Dialog

**Files:**
- Create: `src/components/trip/add-stop-dialog.tsx`

- [ ] **Step 1: Create add stop dialog**

Create `src/components/trip/add-stop-dialog.tsx`:
```typescript
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StopCategory } from "@/lib/types";

interface AddStopDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (stop: {
    name: string;
    latitude: number;
    longitude: number;
    country_code: string;
    category: StopCategory;
  }) => void;
  initialCoords?: { lat: number; lng: number } | null;
}

export function AddStopDialog({ open, onClose, onAdd, initialCoords }: AddStopDialogProps) {
  const [name, setName] = useState("");
  const [latitude, setLatitude] = useState(initialCoords?.lat?.toString() || "");
  const [longitude, setLongitude] = useState(initialCoords?.lng?.toString() || "");
  const [category, setCategory] = useState<StopCategory>("sightseeing");
  const [countryCode, setCountryCode] = useState("CN");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      name,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      country_code: countryCode,
      category,
    });
    setName("");
    setLatitude("");
    setLongitude("");
    setCategory("sightseeing");
    onClose();
  };

  // Sync initial coords when they change
  useState(() => {
    if (initialCoords) {
      setLatitude(initialCoords.lat.toString());
      setLongitude(initialCoords.lng.toString());
    }
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Stop</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stop-name-input">Name</Label>
            <Input
              id="stop-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tiananmen Square"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Latitude</Label>
              <Input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Longitude</Label>
              <Input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as StopCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="sightseeing">Sightseeing</SelectItem>
                  <SelectItem value="hotel">Hotel</SelectItem>
                  <SelectItem value="transport">Transport</SelectItem>
                  <SelectItem value="shopping">Shopping</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CN">China</SelectItem>
                  <SelectItem value="JP">Japan</SelectItem>
                  <SelectItem value="KR">Korea</SelectItem>
                  <SelectItem value="TH">Thailand</SelectItem>
                  <SelectItem value="US">USA</SelectItem>
                  <SelectItem value="GB">UK</SelectItem>
                  <SelectItem value="FR">France</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full">Add Stop</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

Run:
```bash
git add src/components/trip/add-stop-dialog.tsx
git commit -m "feat: add stop creation dialog with coords and category"
```

---

## Task 14: Trip Header & Share Dialog

**Files:**
- Create: `src/components/trip/trip-header.tsx`, `src/components/trip/share-dialog.tsx`

- [ ] **Step 1: Create share dialog**

Create `src/components/trip/share-dialog.tsx`:
```typescript
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  shareToken: string | null;
  tripId: string;
  onGenerate: () => Promise<{ token: string | undefined; error: any }>;
  onRevoke: () => Promise<{ error: any }>;
}

export function ShareDialog({
  open,
  onClose,
  shareToken,
  tripId,
  onGenerate,
  onRevoke,
}: ShareDialogProps) {
  const [copying, setCopying] = useState(false);

  const shareUrl = shareToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/${tripId}?token=${shareToken}`
    : null;

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Trip</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {shareUrl ? (
            <>
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly className="flex-1" />
                <Button onClick={handleCopy}>
                  {copying ? "Copied!" : "Copy"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Anyone with this link can view your trip (read-only).
              </p>
              <Button variant="destructive" size="sm" onClick={onRevoke}>
                Revoke Link
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Generate a shareable link so anyone can view this trip without logging in.
              </p>
              <Button onClick={onGenerate}>Generate Share Link</Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create trip header**

Create `src/components/trip/trip-header.tsx`:
```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShareDialog } from "./share-dialog";
import type { Trip, TripStatus } from "@/lib/types";

interface TripHeaderProps {
  trip: Trip;
  onUpdateStatus: (status: TripStatus) => Promise<{ error: any }>;
  onGenerateShare: () => Promise<{ token: string | undefined; error: any }>;
  onRevokeShare: () => Promise<{ error: any }>;
}

export function TripHeader({
  trip,
  onUpdateStatus,
  onGenerateShare,
  onRevokeShare,
}: TripHeaderProps) {
  const router = useRouter();
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
            Back
          </Button>
          <h1 className="text-lg font-semibold">{trip.title}</h1>
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
        <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
          Share
        </Button>
      </div>
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

Run:
```bash
git add src/components/trip/trip-header.tsx src/components/trip/share-dialog.tsx
git commit -m "feat: add trip header with status selector and share dialog"
```

---

## Task 15: Trip Workspace (Main Page)

**Files:**
- Create: `src/components/trip/trip-workspace.tsx`, `src/app/(protected)/trip/[id]/page.tsx`, `src/app/(protected)/trip/[id]/loading.tsx`

- [ ] **Step 1: Create trip workspace client component**

Create `src/components/trip/trip-workspace.tsx`:
```typescript
"use client";

import { useState, useCallback } from "react";
import { useTrip } from "@/hooks/use-trip";
import { useStops } from "@/hooks/use-stops";
import { TripHeader } from "./trip-header";
import { ItineraryPanel } from "./itinerary-panel";
import { StopDrawer } from "./stop-drawer";
import { AddStopDialog } from "./add-stop-dialog";
import { MapContainer } from "@/components/map/map-container";
import type { StopWithPhotos } from "@/lib/types";

export function TripWorkspace({ tripId }: { tripId: string }) {
  const { trip, loading, refetch, updateStatus, addDay, removeDay, generateShareToken, revokeShareToken } = useTrip(tripId);
  const { addStop, updateStop, deleteStop, reorderStops } = useStops();

  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addStopOpen, setAddStopOpen] = useState(false);
  const [addStopDayId, setAddStopDayId] = useState<string | null>(null);
  const [mapClickCoords, setMapClickCoords] = useState<{ lat: number; lng: number } | null>(null);

  const allStops: StopWithPhotos[] = trip?.trip_days.flatMap((d) => d.stops) || [];

  const selectedStop = allStops.find((s) => s.id === selectedStopId) || null;

  const handleStopClick = (stopId: string) => {
    setSelectedStopId(stopId);
    setDrawerOpen(true);
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (trip && trip.trip_days.length > 0) {
      setMapClickCoords({ lat, lng });
      setAddStopDayId(trip.trip_days[trip.trip_days.length - 1].id);
      setAddStopOpen(true);
    }
  };

  const handleAddStopButton = (dayId: string) => {
    setAddStopDayId(dayId);
    setMapClickCoords(null);
    setAddStopOpen(true);
  };

  const handleAddStop = async (stopData: {
    name: string;
    latitude: number;
    longitude: number;
    country_code: string;
    category: any;
  }) => {
    if (!addStopDayId || !trip) return;
    const day = trip.trip_days.find((d) => d.id === addStopDayId);
    const orderIndex = day ? day.stops.length : 0;

    await addStop(addStopDayId, {
      ...stopData,
      order_index: orderIndex,
      time_start: null,
      time_end: null,
      notes: "",
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

  if (loading) return null;
  if (!trip) return <div className="p-8 text-center">Trip not found.</div>;

  return (
    <div className="h-screen flex flex-col">
      <TripHeader
        trip={trip}
        onUpdateStatus={updateStatus}
        onGenerateShare={generateShareToken}
        onRevokeShare={revokeShareToken}
      />
      <div className="flex-1 flex overflow-hidden">
        {/* Itinerary Panel */}
        <div className="w-[380px] border-r overflow-hidden flex-shrink-0 hidden md:block">
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

        {/* Map */}
        <div className="flex-1">
          <MapContainer
            stops={allStops}
            selectedStopId={selectedStopId}
            onStopClick={handleStopClick}
            onMapClick={handleMapClick}
          />
        </div>
      </div>

      {/* Mobile: Itinerary below map */}
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
        onClose={() => setDrawerOpen(false)}
        onSave={handleSaveStop}
        onDelete={handleDeleteStop}
      />

      <AddStopDialog
        open={addStopOpen}
        onClose={() => setAddStopOpen(false)}
        onAdd={handleAddStop}
        initialCoords={mapClickCoords}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create trip page (server component wrapper)**

Create `src/app/(protected)/trip/[id]/page.tsx`:
```typescript
import { TripWorkspace } from "@/components/trip/trip-workspace";

export default async function TripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TripWorkspace tripId={id} />;
}
```

- [ ] **Step 3: Create loading skeleton**

Create `src/app/(protected)/trip/[id]/loading.tsx`:
```typescript
import { Skeleton } from "@/components/ui/skeleton";

export default function TripLoading() {
  return (
    <div className="h-screen flex flex-col">
      <div className="h-14 border-b flex items-center px-4 gap-3">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="flex-1 flex">
        <div className="w-[380px] border-r p-4 space-y-4 hidden md:block">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="flex-1">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

Run:
```bash
git add src/components/trip/trip-workspace.tsx src/app/\(protected\)/trip/\[id\]/
git commit -m "feat: add trip workspace page with map and itinerary integration"
```

---

## Task 16: Photo Upload

**Files:**
- Create: `src/hooks/use-photos.ts`, `src/components/trip/stop-photos.tsx`

- [ ] **Step 1: Create photos hook**

Create `src/hooks/use-photos.ts`:
```typescript
"use client";

import { createClient } from "@/lib/supabase/client";
import type { StopPhoto } from "@/lib/types";

export function usePhotos() {
  const supabase = createClient();

  const uploadPhoto = async (
    stopId: string,
    tripId: string,
    file: File,
    orderIndex: number
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error("Not authenticated") };

    const ext = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const storagePath = `${user.id}/${tripId}/${stopId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("stop-photos")
      .upload(storagePath, file, { contentType: file.type });

    if (uploadError) return { data: null, error: uploadError };

    const { data, error } = await supabase
      .from("stop_photos")
      .insert({
        stop_id: stopId,
        storage_path: storagePath,
        order_index: orderIndex,
      })
      .select()
      .single();

    return { data: data as StopPhoto | null, error };
  };

  const deletePhoto = async (photoId: string, storagePath: string) => {
    await supabase.storage.from("stop-photos").remove([storagePath]);
    const { error } = await supabase.from("stop_photos").delete().eq("id", photoId);
    return { error };
  };

  const getPhotoUrl = (storagePath: string) => {
    const { data } = supabase.storage.from("stop-photos").getPublicUrl(storagePath);
    return data.publicUrl;
  };

  return { uploadPhoto, deletePhoto, getPhotoUrl };
}
```

- [ ] **Step 2: Create stop photos component**

Create `src/components/trip/stop-photos.tsx`:
```typescript
"use client";

import { useRef } from "react";
import { usePhotos } from "@/hooks/use-photos";
import { Button } from "@/components/ui/button";
import type { StopPhoto } from "@/lib/types";

interface StopPhotosProps {
  photos: StopPhoto[];
  stopId: string;
  tripId: string;
  onUpdate: () => void;
}

const MAX_PHOTOS = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function StopPhotos({ photos, stopId, tripId, onUpdate }: StopPhotosProps) {
  const { uploadPhoto, deletePhoto, getPhotoUrl } = usePhotos();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remaining = MAX_PHOTOS - photos.length;
    const toUpload = Array.from(files).slice(0, remaining);

    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i];
      if (file.size > MAX_FILE_SIZE) continue;
      await uploadPhoto(stopId, tripId, file, photos.length + i);
    }

    onUpdate();
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDelete = async (photo: StopPhoto) => {
    await deletePhoto(photo.id, photo.storage_path);
    onUpdate();
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <div key={photo.id} className="relative group aspect-square">
            <img
              src={getPhotoUrl(photo.storage_path)}
              alt={photo.caption || "Stop photo"}
              className="w-full h-full object-cover rounded-md"
            />
            <button
              onClick={() => handleDelete(photo)}
              className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              x
            </button>
          </div>
        ))}
      </div>
      {photos.length < MAX_PHOTOS && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            + Upload Photos ({photos.length}/{MAX_PHOTOS})
          </Button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Integrate photos into stop drawer**

In `src/components/trip/stop-drawer.tsx`, add the photo section by importing and rendering `StopPhotos` above the "Links" section. Add this import at the top:

```typescript
import { StopPhotos } from "./stop-photos";
```

Then add this block after the Budget section and before the first `<Separator />` that precedes Links:

```typescript
<Separator />

{/* Photos */}
<StopPhotos
  photos={stop.stop_photos}
  stopId={stop.id}
  tripId={stop.day_id} // Will need tripId passed through props
  onUpdate={onPhotosUpdated}
/>
```

Note: This requires adding `tripId: string` and `onPhotosUpdated: () => void` to `StopDrawerProps` and threading them from the workspace. Update the workspace to pass `tripId={tripId}` and `onPhotosUpdated={refetch}` to `StopDrawer`.

- [ ] **Step 4: Commit**

Run:
```bash
git add src/hooks/use-photos.ts src/components/trip/stop-photos.tsx src/components/trip/stop-drawer.tsx
git commit -m "feat: add photo upload and gallery to stop drawer"
```

---

## Task 17: Public Share Page

**Files:**
- Create: `src/app/share/[id]/page.tsx`

- [ ] **Step 1: Create public share page**

Create `src/app/share/[id]/page.tsx`:
```typescript
import { createClient } from "@/lib/supabase/server";
import { MapContainer } from "@/components/map/map-container";
import { Badge } from "@/components/ui/badge";
import type { TripWithDays, StopWithPhotos, StopCategory } from "@/lib/types";

const categoryLabels: Record<StopCategory, string> = {
  food: "Food",
  sightseeing: "Sightseeing",
  hotel: "Hotel",
  transport: "Transport",
  shopping: "Shopping",
  other: "Other",
};

export default async function SharePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  if (!token) {
    return <div className="p-8 text-center">Invalid share link.</div>;
  }

  const supabase = await createClient();
  const { data: trip } = await supabase
    .from("trips")
    .select(`
      *,
      trip_days (
        *,
        stops (
          *,
          stop_photos (*)
        )
      )
    `)
    .eq("id", id)
    .eq("share_token", token)
    .single();

  if (!trip) {
    return <div className="p-8 text-center">Trip not found or link has been revoked.</div>;
  }

  const typedTrip = trip as unknown as TripWithDays;
  const sortedDays = typedTrip.trip_days.sort((a, b) => a.day_number - b.day_number);
  const allStops: StopWithPhotos[] = sortedDays.flatMap((d) =>
    d.stops.sort((a, b) => a.order_index - b.order_index)
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b px-4 py-4">
        <h1 className="text-2xl font-bold">{typedTrip.title}</h1>
        {typedTrip.description && (
          <p className="text-muted-foreground mt-1">{typedTrip.description}</p>
        )}
        <Badge className="mt-2">{typedTrip.status}</Badge>
      </div>

      {/* Map */}
      <div className="h-[400px] border-b">
        <MapContainer
          stops={allStops}
          selectedStopId={null}
          onStopClick={() => {}}
          onMapClick={() => {}}
        />
      </div>

      {/* Itinerary */}
      <div className="container mx-auto py-6 px-4 max-w-3xl">
        {sortedDays.map((day) => (
          <div key={day.id} className="mb-8">
            <h2 className="text-lg font-semibold mb-3">
              Day {day.day_number}
              {day.date && <span className="text-muted-foreground ml-2">({day.date})</span>}
            </h2>
            <div className="space-y-3">
              {day.stops
                .sort((a, b) => a.order_index - b.order_index)
                .map((stop, idx) => (
                  <div key={stop.id} className="flex gap-3 p-3 border rounded-md">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-medium">{stop.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {categoryLabels[stop.category as StopCategory]}
                        </Badge>
                        {stop.time_start && (
                          <span className="text-xs text-muted-foreground">
                            {stop.time_start}{stop.time_end && ` - ${stop.time_end}`}
                          </span>
                        )}
                      </div>
                      {stop.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{stop.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              {day.stops.length === 0 && (
                <p className="text-sm text-muted-foreground">No stops planned.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

Run:
```bash
git add src/app/share/
git commit -m "feat: add public read-only share page"
```

---

## Task 18: Landing Page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create landing page**

Replace `src/app/page.tsx`:
```typescript
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-lg">
        <h1 className="text-4xl font-bold tracking-tight">Leggo</h1>
        <p className="text-xl text-muted-foreground">
          Plan your trips day by day. Pin stops on the map. Share with friends.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/login">
            <Button size="lg">Get Started</Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Supports Baidu Maps for China and Mapbox for international destinations.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

Run:
```bash
git add src/app/page.tsx
git commit -m "feat: add landing page with auth redirect"
```

---

## Task 19: Settings Page & Logout

**Files:**
- Create: `src/app/(protected)/settings/page.tsx`

- [ ] **Step 1: Create settings page**

Create `src/app/(protected)/settings/page.tsx`:
```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { User } from "@/lib/types";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .single();
        setUser(data as User | null);
      }
    };
    fetchUser();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="container mx-auto max-w-lg py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {user && (
            <>
              <div className="flex items-center gap-3">
                {user.avatar_url && (
                  <img
                    src={user.avatar_url}
                    alt="Avatar"
                    className="w-12 h-12 rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium">{user.name || "No name"}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
            </>
          )}
          <Button variant="destructive" onClick={handleLogout}>
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

Run:
```bash
git add src/app/\(protected\)/settings/
git commit -m "feat: add settings page with user profile and logout"
```

---

## Task 20: Next.js Config & Vercel Deployment

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Update Next.js config for external images and map scripts**

Replace `next.config.ts`:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 2: Verify build succeeds**

Run:
```bash
pnpm build
```

Expected: Build completes without errors.

- [ ] **Step 3: Commit**

Run:
```bash
git add next.config.ts
git commit -m "feat: configure Next.js for external images and deployment"
```

---

## Task 21: Final Integration Test

- [ ] **Step 1: Run the dev server and verify all pages load**

Run:
```bash
pnpm dev
```

Verify manually:
- `/` — Landing page renders, redirects to dashboard if logged in
- `/login` — Shows Google OAuth button
- `/dashboard` — Shows trip list (empty state initially)
- `/trip/new` — Shows create trip form
- After creating a trip, `/trip/[id]` — Shows workspace with map and itinerary panel
- Share flow works end-to-end

- [ ] **Step 2: Fix any TypeScript errors**

Run:
```bash
pnpm tsc --noEmit
```

Fix any type errors found.

- [ ] **Step 3: Final commit**

Run:
```bash
git add .
git commit -m "chore: fix any remaining type/lint issues"
```

---

## Supabase Setup Checklist (Manual Steps)

These must be done in the Supabase dashboard before the app works:

1. **Create a Supabase project** at https://supabase.com
2. **Enable Google OAuth provider** in Authentication → Providers → Google
   - Set up Google OAuth credentials at https://console.cloud.google.com
   - Add redirect URL from Supabase dashboard to Google OAuth config
3. **Run the migration** — paste `001_initial_schema.sql` in SQL Editor
4. **Create the `stop-photos` storage bucket** — set to public
5. **Copy `.env.local.example` to `.env.local`** and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_BAIDU_MAP_AK` (from Baidu Maps developer console)
   - `NEXT_PUBLIC_MAPBOX_TOKEN` (from Mapbox account)

## Vercel Deployment Checklist

1. Push repo to GitHub
2. Import project in Vercel
3. Set environment variables in Vercel project settings (same as `.env.local`)
4. Deploy — Vercel auto-detects Next.js
5. Update Supabase Google OAuth redirect URL to include the Vercel production domain
