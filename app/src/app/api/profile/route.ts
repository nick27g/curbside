import { NextResponse } from "next/server";
import { createAuthServerClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceRoleClient();
  const { data, error } = await serviceClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
