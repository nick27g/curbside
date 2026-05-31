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

## Project Structure
- /app — Next.js app
- /app/src/app — pages and API routes
- /app/src/components — React components
- /app/src/context — React context (AuthContext)
- /app/src/lib/supabase — browser.ts and server.ts clients
- /app/src/lib/types.ts — shared TypeScript types

## Current Status
Sprint 3 complete — auth and user roles.
Next task: Sprint 3.5 — Driver Verification and Admin.

## Supabase Tables
locations: id, vendor_id (uuid, FK to auth.users), latitude, longitude, 
           label, created_at. RLS enabled.
profiles:  id (uuid, FK to auth.users), role (text: driver|customer), 
           created_at. RLS enabled. Auto-populated via trigger.
