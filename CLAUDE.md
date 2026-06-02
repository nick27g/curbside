# CLAUDE.md — Curbside

## Project
Real-time street food vendor tracking app. Customers find trucks, 
drivers share location and get AI route suggestions.

## Stack
- Next.js 16 + TypeScript + Tailwind (frontend)
- Supabase (PostgreSQL + PostGIS, auth, realtime)
- Mapbox (maps)
- Anthropic API / Claude Sonnet (AI routes, Sprint 5)
- Vercel (deployment)

## Key Decisions
- Next.js 16 uses proxy.ts not middleware.ts
- Auth sessions stored in cookies via @supabase/ssr, not localStorage
- API routes: check identity first (401 guard), then write to DB
- Use anon key + cookie to verify identity, service role key to write
- profiles table requires explicit RLS SELECT policy or reads return null
- vendor_id on location rows is the real auth user UUID
- Each GPS tick inserts a new locations row (no upsert); MapView deduplicates
  by vendor_id client-side, keeping only the latest active row per driver
- Realtime subscription uses the browser (anon) client; locations table needs
  an RLS SELECT policy for the authenticated role or UPDATE events won't arrive
- PATCH /api/locations/deactivate sets is_active=false on all of a driver's
  active rows, which triggers the Realtime UPDATE that removes the map pin

## Project Structure
- /app — Next.js app
- /app/src/app — pages and API routes
- /app/src/components — React components
- /app/src/context — React context (AuthContext)
- /app/src/lib/supabase — browser.ts and server.ts clients
- /app/src/lib/types.ts — shared TypeScript types

## Current Status
Sprint 4 complete — real-time location tracking.
Next task: Sprint 5 — Heat Maps and AI Routes.

## Supabase Tables
locations: id, vendor_id (uuid, FK to auth.users), latitude, longitude,
           timestamp, is_active, heading, speed. RLS enabled.
profiles:  id (uuid, FK to auth.users), role (text: driver|customer),
           status (text: pending|approved|rejected, default approved),
           is_admin (boolean, default false),
           created_at. RLS enabled. Auto-populated via trigger.
