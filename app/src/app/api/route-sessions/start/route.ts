import { NextResponse } from "next/server";
import { createAuthServerClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function POST() {
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

  const { data, error } = await serviceClient
    .from("route_sessions")
    .insert({ driver_id: user.id, is_active: true })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
