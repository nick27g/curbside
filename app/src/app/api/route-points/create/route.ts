import { NextRequest, NextResponse } from "next/server";
import { createAuthServerClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const authClient = await createAuthServerClient();
  const { data: { user } } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceRoleClient();

  const { data: driverProfile } = await serviceClient
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  if (driverProfile?.status !== "approved") {
    return NextResponse.json({ error: "Your account is pending approval" }, { status: 403 });
  }

  const body = await req.json();
  const { session_id, latitude, longitude } = body;

  if (!session_id || latitude === undefined || longitude === undefined) {
    return NextResponse.json(
      { error: "session_id, latitude, and longitude are required" },
      { status: 400 }
    );
  }

  const { data, error } = await serviceClient
    .from("route_points")
    .insert({
      session_id,
      driver_id: user.id,
      latitude: Math.round(Number(latitude) * 1000) / 1000,
      longitude: Math.round(Number(longitude) * 1000) / 1000,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
