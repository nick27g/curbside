import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient, getUserFromRequest } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest) {
  const user = await getUserFromRequest(req);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceRoleClient();

  const { error } = await serviceClient
    .from("locations")
    .update({ is_active: false })
    .eq("vendor_id", user.id)
    .eq("is_active", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
