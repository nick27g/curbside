import { NextResponse } from "next/server";
import { createAuthServerClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  const authClient = await createAuthServerClient();
  const { data: { user } } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceRoleClient();

  const { data, error } = await serviceClient
    .from("route_points")
    .select("latitude, longitude")
    .eq("driver_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const geojson = {
    type: "FeatureCollection",
    features: (data ?? []).map((point) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [point.longitude, point.latitude],
      },
      properties: {},
    })),
  };

  return NextResponse.json(geojson);
}
