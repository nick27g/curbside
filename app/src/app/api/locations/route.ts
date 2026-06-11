import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("is_active", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) return NextResponse.json([]);

  const vendorIds = [...new Set(data.map((l) => l.vendor_id as string))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, vendor_type")
    .in("id", vendorIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id as string, p.vendor_type as string | null]));
  const enriched = data.map((l) => ({ ...l, vendor_type: profileMap.get(l.vendor_id) ?? null }));

  return NextResponse.json(enriched);
}
