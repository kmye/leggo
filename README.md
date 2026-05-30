# Leggo

A travel planner application where users create day-by-day trip itineraries with stops pinned on Google Maps. Supports photo uploads, shareable read-only links, and drag-and-drop stop reordering.

## Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io/installation)
- A [Supabase](https://supabase.com) project
- A [Google Cloud](https://console.cloud.google.com) project with Maps JavaScript API enabled

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Authentication > Providers > Google** and enable it
   - Create OAuth credentials at [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Set the authorized redirect URI to: `https://<your-supabase-project>.supabase.co/auth/v1/callback`
3. Go to **SQL Editor** and run the contents of `supabase/migrations/001_initial_schema.sql`
4. Go to **Storage** and create a bucket named `stop-photos` (set to public)

### 3. Configure Google Maps

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/library)
2. Enable **Maps JavaScript API**
3. Create an API key under **Credentials**
4. (Optional) Restrict the key to your domains

### 4. Set environment variables

```bash
cp .env.local.example .env.local
```

Fill in your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

### 5. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment (Vercel)

1. Push the repo to GitHub
2. Import the project at [vercel.com/new](https://vercel.com/new)
3. Add the same environment variables in Vercel project settings
4. Deploy — Vercel auto-detects Next.js
5. Update your Supabase Google OAuth redirect URI to include the production domain:
   `https://your-app.vercel.app/callback`

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Auth & Database:** Supabase (PostgreSQL + Google OAuth + Storage)
- **Maps:** Google Maps (`@react-google-maps/api`)
- **UI:** Tailwind CSS + shadcn/ui
- **Drag & Drop:** @dnd-kit
- **Hosting:** Vercel
