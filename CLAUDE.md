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
- Historical route storage runs in parallel to live tracking: a 30s interval
  in AddLocationForm writes to route_points; session lifecycle managed via
  /api/route-sessions/start (on Start Tracking) and /api/route-sessions/stop
  (on Stop Tracking); sessionIdRef (useRef) holds the active session ID so
  the interval closure always reads the current value without stale capture
- route_points coordinates are rounded to 3 decimal places on write (~111m
  precision) for privacy; heatmap visual radius is 70px to match
- Heatmap layer is driver-only: fetched from /api/route-points/heatmap (auth-
  gated) and toggled via a button in MapView.tsx; customers never see it
- profiles.vendor_type (text, nullable) stores the vendor's cart type; written
  by the handle_new_user trigger from raw_user_meta_data; signup page shows a
  dropdown only when role = driver; customers get NULL
- AI route suggestion: POST /api/ai/route-suggest takes { latitude, longitude },
  checks driver+approved, aggregates route_points into hot zones (grouped by
  3dp lat/lng in JS), determines tier (0 zones=1, 1-4=2, 5+=3), builds a
  tier-appropriate prompt, calls claude-sonnet-4-5 via raw fetch, returns
  { suggestions: [{zone, time_window, reason}], tier }
- RoutePanel renders AI suggestions as cards in the driver UI; driverCoords
  flows from AddLocationForm (via onCoordsChange callback) up through MapView
  state; button disabled until GPS tracking is active; tier label shown after
  first successful fetch
- Driver controls panel (AddLocationForm + RoutePanel) is absolutely positioned
  at bottom-right of the map container (width 360px, zIndex 1), same pattern
  as the heatmap toggle button at top-right
- Customer geolocation uses navigator.geolocation.watchPosition gated on
  role === "customer"; watcher is cleaned up on unmount; coords stored in
  customerCoords state in MapView.tsx; drivers use their own GPS flow via
  AddLocationForm and are never enrolled in this watcher
- Proximity detection uses Haversine formula (haversineDistance, module-level
  in MapView.tsx) to find the closest active driver pin within 0.5 miles of
  the customer; result stored in nearbyVendor (Location | null); rechecked on
  every customerCoords or locations change
- Proximity alert is a dismissible amber banner (absolute top-0, full width,
  z-10) in MapView.tsx; dismissed state resets to false whenever nearbyVendor
  changes to a new non-null value via a dedicated useEffect
- Community sightings: customers report unverified vendor sightings via a
  floating "Report Sighting" button (absolute bottom-4 left-4); form posts to
  POST /api/sightings/create with rate limiting (max 3 per hour per user,
  enforced server-side by counting created_at >= now() - 1h); rows expire
  after 2 hours (expires_at = now() + interval '2 hours', DB default)
- Sightings table has RLS: authenticated SELECT where expires_at > now(),
  INSERT with reported_by = auth.uid(), UPDATE (confirmed/dismissed counts)
  on non-expired rows; no DELETE policy (soft expiry only)
- GET /api/sightings is public (no auth) and returns non-expired rows ordered
  by created_at desc; fetched on mount and every 60s via setInterval stored
  in sightingsIntervalRef (useRef) in MapView.tsx; also refreshed immediately
  after a successful submission or vote
- Sighting pins render in Map.tsx as amber circles (w-4 h-4 rounded-full
  bg-amber-400 border-2 border-amber-600) distinct from driver 📍 pins;
  clicking a pin opens a Mapbox Popup with vendor_type, description, vote
  counts, and Confirm/Dismiss buttons
- POST /api/sightings/vote takes { sighting_id, action: "confirm"|"dismiss" },
  requires auth, does a select-then-update increment (no custom SQL function);
  returns 404 if sighting is missing or expired; vote closes the popup and
  triggers fetchSightings via onSightingVote callback prop on MapComponent

## Project Structure
- /app — Next.js app
- /app/src/app — pages and API routes
- /app/src/components — React components
- /app/src/context — React context (AuthContext)
- /app/src/lib/supabase — browser.ts and server.ts clients
- /app/src/lib/types.ts — shared TypeScript types

## Current Status
Sprints 5.4 and 5.5 complete. Next: Sprint 6 — Mobile App (React Native + Expo).

Sprint 5.4 — Proximity alerts: customer geolocation (watchPosition), Haversine
distance detection, dismissible amber banner when a driver pin is within 0.5mi.

Sprint 5.5 — Community sightings: report form with rate limiting, sighting pins
on map (amber circles), confirm/dismiss voting, 2-hour auto-expiry via DB default.

## Supabase Tables
locations:      id, vendor_id (uuid, FK to auth.users), latitude, longitude,
                timestamp, is_active, heading, speed. RLS enabled.
profiles:       id (uuid, FK to auth.users), role (text: driver|customer),
                status (text: pending|approved|rejected, default approved),
                is_admin (boolean, default false),
                vendor_type (text, nullable: ice_cream_truck|food_truck|
                hot_dog_cart|other), created_at. RLS enabled.
                Auto-populated via trigger.
route_sessions: id, driver_id (uuid, FK to auth.users), started_at, ended_at,
                is_active.
route_points:   id, session_id (FK to route_sessions), driver_id (uuid, FK to
                auth.users), latitude, longitude, recorded_at.
sightings:      id (uuid), reported_by (uuid, FK to auth.users), latitude,
                longitude, vendor_type (text, nullable), description (text,
                nullable), confirmed_count (int, default 0), dismissed_count
                (int, default 0), expires_at (timestamptz, default now()+2h),
                created_at (timestamptz). RLS enabled. Index on expires_at.
