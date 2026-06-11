# Curbside

Real-time street food vendor tracking for customers and drivers.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-curbside--nine.vercel.app-brightgreen)](https://curbside-nine.vercel.app)

---

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)
![Mapbox](https://img.shields.io/badge/Mapbox-000000?logo=mapbox)
![Anthropic API](https://img.shields.io/badge/Anthropic%20API-Claude-orange)
![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel)
![React Native](https://img.shields.io/badge/React%20Native-61DAFB?logo=react&logoColor=black)
![Expo](https://img.shields.io/badge/Expo-000020?logo=expo)

---

## What is Curbside?

Curbside is a real-time street food vendor tracking app that connects hungry customers with nearby food trucks and carts. Customers open a live map to see active vendor pins and get proximity alerts when a truck rolls within half a mile. Drivers broadcast their GPS location, view a heat map of their historical routes, and receive AI-powered suggestions for where and when to park next.

## Features

- **Live vendor map** with real-time pins, custom vendor-type icons, hover tooltips, and neighborhood popups
- **Role-based auth**: customer, driver, admin (Supabase Auth)
- **Driver GPS tracking** with live location broadcast, reverse geocoded neighborhood status, and location search with map flyTo
- **Historical route storage** and driver-only heat map layer
- **AI route suggestions** powered by Anthropic API — tiered by history depth, hyper-local (1-mile radius), time-aware, and target-location biased
- **Proximity alerts** for nearby vendors — toast notification with vendor type, distance, and "Show on Map" button
- **Community sightings** with 2-hour auto-expiry and crowd-sourced confirm/dismiss voting
- **Customer vendor filter** to show only ice cream trucks, food trucks, or other vendors
- **React Native + Expo** companion mobile app with Mapbox native maps and push notifications
- **Vercel deployment** with automatic CI/CD on every push

## Build Journey

### Phase 0: Dev Environment Setup

Bootstrapped the project from scratch: Node.js, Git, Claude Code CLI, and a fresh Next.js 16 scaffold with TypeScript and Tailwind. Established the repo structure and local tooling before writing a single line of app code.

---

### Sprint 1: First Map on Screen

Integrated Mapbox GL JS and rendered a live map centered on Chicago with a hardcoded marker pin. Proved the rendering pipeline end-to-end before touching any backend.

![Sprint 1 — Map](screenshots/sprint-1-map.png)
![Sprint 1 — Map pin](screenshots/sprint-1-map-pin.png)

---

### Sprint 2: Database Connection

Wired up Supabase with a `locations` table and row-level security. The map now reads real pins from the database and displays them on load.

![Sprint 2 — Database](screenshots/sprint-2-database.png)
![Sprint 2 — Active location](screenshots/sprint-2-active-location.png)
![Sprint 2 — Adding pin](screenshots/sprint-2-adding-pin.png)
![Sprint 2 — Step 6](screenshots/sprint-2-step-6.png)

---

### Sprint 3: Auth and User Roles

Implemented Supabase Auth with a `profiles` table and role-based UI — customers see the map, drivers see tracking controls. Added login/signup pages and worked through the Next.js 16 `proxy.ts` routing quirk that replaces `middleware.ts`.

![Sprint 3 — Login](screenshots/sprint-3-login.png)
![Sprint 3 — Logged in](screenshots/sprint-3-logged-in.png)
![Sprint 3 — Driver role](screenshots/sprint-3-driver-role.png)
![Sprint 3 — Design](screenshots/sprint-3-design.png)

---

### Sprint 3.5: Driver Verification and Admin Panel

Added a driver approval workflow: new drivers start in `pending` status and an admin panel lets admins approve or reject them before their pins appear on the map.

![Sprint 3.5 — Admin panel](screenshots/sprint-3-5-admin.png)

---

### Sprint 4: Real-Time Location Tracking

Hooked `navigator.geolocation` in the driver UI and pushed GPS ticks to Supabase via an API route. Supabase Realtime delivers `INSERT`/`UPDATE` events to every connected customer browser, moving pins live without polling. Handled browser permission flows and RLS policy gaps.

![Sprint 4 — GPS](screenshots/sprint-4-gps.png)
![Sprint 4 — Supabase](screenshots/sprint-4-supabase.png)
![Sprint 4 — Permissions](screenshots/sprint-4-permissions.png)

---

### Sprint 5: Heat Maps, AI Routes, Proximity Alerts, Community Sightings

Four features shipped in one phase. Route sessions and `route_points` power a driver-only heat map. The Anthropic API endpoint analyzes historical hot zones and returns tiered suggestions (works from zero data up). Customer geolocation via `watchPosition` feeds Haversine proximity detection with a dismissible banner. Community sightings let customers report unverified vendors with rate limiting, voting, and 2-hour expiry.

![Sprint 5.1 — Route sessions](screenshots/sprint-5-1-route-sessions.png)
![Sprint 5.2 — Heat map](screenshots/sprint-5-2-heatmap.png)
![Sprint 5.3 — Vendor type](screenshots/sprint-5-3-vendor-type.png)
![Sprint 5.3 — AI routes](screenshots/sprint-5-3-ai-routes.png)

---

### Sprint 6: React Native Mobile App

Built a companion Expo app with Mapbox native maps, reusing the same Supabase auth flow via Bearer token headers. Drivers can broadcast GPS from their phone; customers receive Expo push notifications when a vendor enters their half-mile radius. Code complete — pending Apple Developer account for TestFlight distribution.

---

## Sprint 7 — Location Intelligence

### Sprint 7.1: Reverse Geocoding

- Shared `lib/reverseGeocode.ts` utility calls the Mapbox Reverse Geocoding API and returns a neighborhood name (falls back to "Chicago area")
- Driver GPS status shows current neighborhood, debounced to only re-geocode after ~100m of movement
- Clicking a vendor pin opens a popup with the neighborhood name
- AI route suggestions include the driver's current neighborhood in the prompt

![Sprint 7.1 — Reverse Geocoding](screenshots/sprint-7-1-reverse-geocoding.png)

### Sprint 7.2: Vendor Location Search

- Search bar in the driver panel with 300ms debounce and Chicago-scoped Mapbox forward geocoding (bbox + proximity bias)
- Up to 5 dropdown suggestions; selecting one calls `map.flyTo` (zoom 14), sets a "Heading to" label, and places a 📌 destination marker
- Target location passed through to the AI route prompt: "Driver is heading to: {place}"

### Sprint 7.3: Route Panel Polish + QOL

- Suggestion cards container is scrollable (`max-height` + `overflow-y: auto`) — cards no longer push off screen
- Loading spinner and "Thinking…" state on the route suggestion button during AI fetch
- Customer empty state overlay when no vendors are active
- Stop Tracking requires a `window.confirm` to prevent accidental taps
- Hyper-local AI constraints: 1-mile radius, specific street intersections, bias toward target location
- Navigate button on each suggestion card opens Google Maps in a new tab

### Sprint 7.4: Map Polish + Smart AI Timing

- Custom circular vendor-type pins (36px): 🍦 purple border for ice cream, 🚚 amber for food trucks, 🌭 orange for hot dog carts, 📍 indigo default
- Red destination marker (📌) placed on the map when a search result is selected
- 1-mile GeoJSON radius ring drawn around the destination (red fill at 8% opacity, red border at 40%)
- Hover tooltip on vendor pins shows vendor type (e.g. "🍦 Ice Cream Truck")
- AI prompt includes current day + time ("Wednesday, 6:15 PM") with a 2-hour time-window constraint
- `GET /api/locations` enriched with `vendor_type` via a batched profiles join — no N+1

### Sprint 7.5: Customer Experience + UI Overhaul

- **Vendor filter bar**: customers can filter pins by type — All / 🍦 Ice Cream / 🚚 Food Truck / 🛒 Other
- **Sighting popups**: reverse geocoded neighborhood name shown on community sighting clicks
- **Distance to vendor**: vendor click popup shows miles from customer's current location
- **Last seen timestamp**: popup shows "Updated X mins ago" from the location row's timestamp
- **Proximity toast**: redesigned as a dark bottom-center slide-up toast with vendor type, distance, "Show on Map" flyTo button, and 8-second auto-dismiss
- **Navbar**: sprint label replaced with live "🟢 X vendors active" count for customers and a driver status badge (Approved ✓ / Pending)
- **Driver panel**: full-width purple tracking button, GPS status centered below it, manual coordinate fields de-emphasized
- **Color pass**: primary action color unified to `#8b5cf6` throughout; consistent muted grey secondary text; smooth button transitions

---

### Final Phase: Security, Polish, and Launch

Ongoing hardening, UX polish, and launch prep across both the web and mobile apps.

---

## Architecture

The project lives in two repos: this web repo (Next.js 16 on Vercel) and a separate React Native / Expo mobile repo. The web app integrates four external services — Supabase (PostgreSQL + PostGIS, Auth, Realtime), Mapbox (map tiles and GL rendering), Anthropic API (AI route suggestions), and Expo (push notification delivery). All AI calls are server-side, proxied through Next.js API routes, so API keys never touch the browser.

## Local Development

```bash
git clone https://github.com/nick27g/curbside.git
cd curbside/app
npm install
```

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_MAPBOX_TOKEN=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
