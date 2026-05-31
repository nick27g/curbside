import { NextRequest, NextResponse } from "next/server";
import { createAuthServerClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const authClient = await createAuthServerClient();
  const { data: { user } } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { latitude, longitude } = body;

  if (latitude === undefined || longitude === undefined) {
    return NextResponse.json({ error: "latitude and longitude are required" }, { status: 400 });
  }

  const serviceClient = createServiceRoleClient();
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
