import { NextRequest, NextResponse } from "next/server";
import { createAuthServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import { reverseGeocode } from "@/lib/reverseGeocode";

const SYSTEM_PROMPT =
  "You are a route optimization assistant for street food vendors. " +
  "Your job is to suggest 2-3 high-traffic locations for a vendor to work based on the time of day, " +
  "day of week, vendor type, and any historical data provided. " +
  "Always respond with valid JSON only -- no preamble, no explanation outside the JSON. " +
  "Your response must be an array of exactly 2-3 suggestion objects, each with these fields:\n" +
  '{ zone: string, time_window: string, reason: string }\n' +
  "Be specific and practical. Prioritize foot traffic patterns and time-of-day behavior. " +
  "Tailor suggestions to the vendor type. " +
  "If historical hot zones are provided, weight your suggestions toward confirmed high-activity areas " +
  "while still considering time patterns.";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTime(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12;
  const minuteStr = minutes === 0 ? "" : `:${String(minutes).padStart(2, "0")}`;
  return `${hours}${minuteStr}${ampm}`;
}

export async function POST(req: NextRequest) {
  // ── 1. AUTH CHECK ──────────────────────────────────────────────────────────
  // Same two-client pattern as every other route: anon+cookies for identity,
  // service role for all DB reads/writes.
  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceRoleClient();

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("role, status, vendor_type")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "driver" || profile.status !== "approved") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const vendorType: string = profile.vendor_type ?? "unknown";

  // ── 2. PARSE REQUEST BODY ──────────────────────────────────────────────────
  let latitude: number;
  let longitude: number;
  let targetLocation: string | null = null;
  try {
    const body = await req.json();
    latitude = body.latitude;
    longitude = body.longitude;
    targetLocation = typeof body.targetLocation === "string" ? body.targetLocation : null;
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      throw new Error("Invalid coordinates");
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // ── 3. QUERY ROUTE HISTORY ─────────────────────────────────────────────────
  // Fetch all of this driver's route_points. Coordinates are already rounded
  // to 3dp on write, so the string key is an exact match for grouping.
  const { data: points } = await serviceClient
    .from("route_points")
    .select("latitude, longitude")
    .eq("driver_id", user.id);

  const zoneCounts = new Map<string, { latitude: number; longitude: number; count: number }>();
  for (const pt of points ?? []) {
    const key = `${pt.latitude},${pt.longitude}`;
    const existing = zoneCounts.get(key);
    if (existing) {
      existing.count++;
    } else {
      zoneCounts.set(key, { latitude: pt.latitude, longitude: pt.longitude, count: 1 });
    }
  }

  const sortedZones = Array.from(zoneCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // ── 4. DETERMINE TIER ─────────────────────────────────────────────────────
  // Tier 1: no history. Tier 2: light history (1-4 zones). Tier 3: rich history.
  const tier: 1 | 2 | 3 =
    sortedZones.length === 0 ? 1 : sortedZones.length <= 4 ? 2 : 3;

  // ── 5. BUILD PROMPT ────────────────────────────────────────────────────────
  const now = new Date();
  const timeStr = formatTime(now);
  const dayStr = DAYS[now.getDay()];
  const neighborhood = await reverseGeocode(latitude, longitude);

  const header =
    `Vendor type: ${vendorType}\n` +
    `Current time: ${timeStr}\n` +
    `Day of week: ${dayStr}\n` +
    `Driver is currently in ${neighborhood}.\n` +
    (targetLocation ? `Driver is heading to: ${targetLocation}.\n` : "") +
    `Approximate location: ${latitude}, ${longitude}`;

  let userMessage: string;

  if (tier === 1) {
    userMessage =
      `${header}\n` +
      `No route history available for this vendor.\n\n` +
      `Suggest 2-3 high-traffic locations for this vendor to work right now.`;
  } else {
    const zoneList = sortedZones
      .map((z) => `- Zone at ${z.latitude}, ${z.longitude}: ${z.count} visit${z.count !== 1 ? "s" : ""}`)
      .join("\n");

    if (tier === 2) {
      userMessage =
        `${header}\n` +
        `Historical hot zones (visit counts):\n${zoneList}\n\n` +
        `Suggest 2-3 locations, weighting toward confirmed high-activity hot zones while considering the current time of day.`;
    } else {
      userMessage =
        `${header}\n` +
        `Top 8 historical hot zones (visit counts):\n${zoneList}\n\n` +
        `Suggest 2-3 locations, synthesizing time-of-day patterns across these hot zones for optimal positioning right now.`;
    }
  }

  // ── 6. CALL ANTHROPIC API ──────────────────────────────────────────────────
  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text();
    return NextResponse.json({ error: `Anthropic API error: ${errText}` }, { status: 500 });
  }

  // ── 7. PARSE AND RETURN ────────────────────────────────────────────────────
  const anthropicData = await anthropicRes.json();
  const rawText: string = anthropicData.content?.[0]?.text ?? "";

  let suggestions: unknown;
  try {
    const cleaned = rawText.replace(/```json\n?|\n?```/g, "").trim();
    suggestions = JSON.parse(cleaned);
  } catch {
    return NextResponse.json(
      { error: "Failed to parse AI response as JSON", raw: rawText },
      { status: 500 }
    );
  }

  return NextResponse.json({ suggestions, tier }, { status: 200 });
}
