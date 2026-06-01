import { redirect } from "next/navigation";
import { createAuthServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) redirect("/");

  const serviceClient = createServiceRoleClient();
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Navbar />
      <div style={{ flex: 1, overflowY: "auto", background: "#111827" }}>
        {children}
      </div>
    </div>
  );
}
