import { NextRequest, NextResponse } from "next/server";
import { createAuthServerClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const authClient = await createAuthServerClient();
  const { data: { user } } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { sighting_id, action } = body;

  if (!sighting_id || (action !== "confirm" && action !== "dismiss")) {
    return NextResponse.json(
      { error: "sighting_id and action (confirm|dismiss) are required" },
      { status: 400 }
    );
  }

  const serviceClient = createServiceRoleClient();
  const now = new Date().toISOString();

  const { data: current, error: fetchError } = await serviceClient
    .from("sightings")
    .select("confirmed_count, dismissed_count")
    .eq("id", sighting_id)
    .gt("expires_at", now)
    .single();

  if (fetchError || !current) {
    return NextResponse.json({ error: "Sighting not found or expired" }, { status: 404 });
  }

  const increment =
    action === "confirm"
      ? { confirmed_count: current.confirmed_count + 1 }
      : { dismissed_count: current.dismissed_count + 1 };

  const { data, error } = await serviceClient
    .from("sightings")
    .update(increment)
    .eq("id", sighting_id)
    .gt("expires_at", now)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Update failed" }, { status: 500 });
  }

  return NextResponse.json(data);
}
