import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const PROXIMITY_MILES = 0.5;

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function formatVendorType(vendorType: string | null): string {
  if (!vendorType) return "vendor";
  return vendorType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { vendorId, vendorType, latitude, longitude } = body;

  if (!vendorId || latitude === undefined || longitude === undefined) {
    return NextResponse.json(
      { error: "vendorId, latitude, and longitude are required" },
      { status: 400 }
    );
  }

  const serviceClient = createServiceRoleClient();

  const { data: customers, error } = await serviceClient
    .from("profiles")
    .select("id, push_token, latitude, longitude")
    .eq("role", "customer")
    .not("push_token", "is", null)
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const nearby = (customers ?? []).filter(
    (c) => haversineDistance(latitude, longitude, c.latitude, c.longitude) <= PROXIMITY_MILES
  );

  if (nearby.length === 0) {
    return NextResponse.json({ sent: 0, errors: [] });
  }

  const vendorLabel = formatVendorType(vendorType);
  const messages = nearby.map((c) => ({
    to: c.push_token as string,
    title: `${vendorLabel} nearby!`,
    body: `A ${vendorLabel} is within 0.5 miles of you — check the map!`,
    data: { vendorId, vendorType, latitude, longitude },
  }));

  const expoRes = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
    },
    body: JSON.stringify(messages),
  });

  const expoJson = await expoRes.json();
  const results: { status: string; id?: string; message?: string }[] = expoJson.data ?? [];
  const errors = results.filter((r) => r.status === "error");

  return NextResponse.json({ sent: results.length - errors.length, errors });
}
