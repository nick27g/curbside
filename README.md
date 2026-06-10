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

- **Live vendor map** with real-time pins (Mapbox + Supabase Realtime)
- **Role-based auth**: customer, driver, admin (Supabase Auth)
- **Driver GPS tracking** with live location broadcast
- **Historical route storage** and driver-only heat map layer
- **AI route suggestions** powered by Anthropic API — tiered to work with zero historical data through rich multi-session patterns
- **Proximity alerts** for nearby vendors (Haversine distance, 0.5 mile threshold)
- **Community sightings** with 2-hour auto-expiry and crowd-sourced confirm/dismiss voting
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

Replaced raw lat/lng displays with human-readable neighborhood names using the Mapbox Reverse Geocoding API. Driver GPS status shows the current neighborhood (debounced to fire only after ~100m of movement). Clicking a vendor pin on the customer map opens a popup with the neighborhood name. AI route suggestions now include the driver's current neighborhood in the prompt for more geographically grounded recommendations.

![Sprint 7.1 — Reverse Geocoding](screenshots/sprint-7-1-reverse-geocoding.png)

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
