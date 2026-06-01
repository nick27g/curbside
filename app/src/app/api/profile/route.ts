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
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Profile missing — trigger may not have fired; auto-create with role from metadata
  if (!data) {
    const role =
      (user.user_metadata?.role as string) === "driver" ? "driver" : "customer";
    const status = role === "driver" ? "pending" : "approved";
    const { data: created, error: createError } = await serviceClient
      .from("profiles")
      .insert({ id: user.id, role, status })
      .select()
      .single();
    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }
    return NextResponse.json(created);
  }

  return NextResponse.json(data);
}

export async function PATCH() {
  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = user.user_metadata?.role as string | undefined;
  if (!role || !["customer", "driver"].includes(role)) {
    return NextResponse.json({ error: "Invalid role in user metadata" }, { status: 400 });
  }

  const serviceClient = createServiceRoleClient();
  const status = role === "driver" ? "pending" : "approved";
  const { data, error } = await serviceClient
    .from("profiles")
    .upsert({ id: user.id, role, status }, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
