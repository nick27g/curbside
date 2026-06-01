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

  const { data: requestorProfile } = await serviceClient
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!requestorProfile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: drivers, error } = await serviceClient
    .from("profiles")
    .select("*")
    .eq("role", "driver")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const {
    data: { users },
  } = await serviceClient.auth.admin.listUsers();

  const emailMap = new Map(users.map((u) => [u.id, u.email ?? null]));
  const result = drivers.map((d) => ({ ...d, email: emailMap.get(d.id) ?? null }));

  return NextResponse.json(result);
}
