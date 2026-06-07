import { NextRequest, NextResponse } from "next/server";
import { createAuthServerClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const authClient = await createAuthServerClient();
  const { data: { user } } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceRoleClient();

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await serviceClient
    .from("sightings")
    .select("id", { count: "exact", head: true })
    .eq("reported_by", user.id)
    .gte("created_at", oneHourAgo);

  if ((count ?? 0) >= 3) {
    return NextResponse.json(
      { error: "Rate limit exceeded: max 3 sightings per hour." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const { latitude, longitude, vendor_type, description } = body;

  if (latitude === undefined || longitude === undefined) {
    return NextResponse.json({ error: "latitude and longitude are required" }, { status: 400 });
  }

  const { data, error } = await serviceClient
    .from("sightings")
    .insert({
      reported_by: user.id,
      latitude: Number(latitude),
      longitude: Number(longitude),
      vendor_type: vendor_type ?? null,
      description: description ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
