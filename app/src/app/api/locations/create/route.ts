import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient, getUserFromRequest } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);

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
  const { latitude, longitude } = body;

  if (latitude === undefined || longitude === undefined) {
    return NextResponse.json({ error: "latitude and longitude are required" }, { status: 400 });
  }
  const { data, error } = await serviceClient
    .from("locations")
    .insert({
      vendor_id: user.id,
      latitude: Number(latitude),
      longitude: Number(longitude),
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
