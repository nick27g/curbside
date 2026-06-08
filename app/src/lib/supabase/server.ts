import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export async function createAuthServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server component — cookie writes are best-effort
          }
        },
      },
    }
  );
}

// Resolves the authenticated Supabase user from either a Bearer token
// (mobile clients) or a session cookie (web clients). Cookie-based auth
// is checked only if no valid Bearer token is present, so existing web
// flows are completely unaffected.
export async function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  console.log("[getUserFromRequest] Authorization header present:", !!authHeader);

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    console.log("[getUserFromRequest] Token (first 20):", token.slice(0, 20));

    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error } = await client.auth.getUser(token);
    console.log("[getUserFromRequest] getUser error:", error ?? "none");
    console.log("[getUserFromRequest] getUser user:", user ? `present (id: ${user.id})` : "null");

    if (user) return user;
  }

  // Fall back to cookie-based session (web browser clients)
  const authClient = await createAuthServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  return user ?? null;
}

export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
