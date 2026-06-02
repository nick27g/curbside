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
  const { session_id } = body;

  if (!session_id) {
    return NextResponse.json({ error: "session_id is required" }, { status: 400 });
  }

  const { data, error } = await serviceClient
    .from("route_sessions")
    .update({ ended_at: new Date().toISOString(), is_active: false })
    .eq("id", session_id)
    .eq("driver_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
