"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"customer" | "driver">("customer");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div style={cardStyle}>
      <h1 style={headingStyle}>Create Account</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={inputStyle}
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={6}
            style={inputStyle}
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>I am a…</label>
          <div style={{ display: "flex", gap: 10 }}>
            {(["customer", "driver"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  background: role === r ? "#3b82f6" : "#374151",
                  color: "white",
                  border: role === r ? "1px solid #60a5fa" : "1px solid #4b5563",
                  borderRadius: 7,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        {error && <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{error}</p>}
        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? "Creating account…" : "Sign Up"}
        </button>
      </form>
      <p style={{ marginTop: 18, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
        Already have an account?{" "}
        <Link href="/auth/login" style={{ color: "#60a5fa" }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#1f2937",
  borderRadius: 12,
  padding: "36px 32px",
  width: 340,
  boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
};

const headingStyle: React.CSSProperties = {
  color: "white",
  fontSize: 22,
  fontWeight: 700,
  marginBottom: 24,
  textAlign: "center",
};

const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };

const labelStyle: React.CSSProperties = { color: "#9ca3af", fontSize: 12 };

const inputStyle: React.CSSProperties = {
  padding: "9px 12px",
  background: "#374151",
  color: "white",
  border: "1px solid #4b5563",
  borderRadius: 7,
  fontSize: 14,
  outline: "none",
};

const btnStyle: React.CSSProperties = {
  padding: "10px",
  background: "#3b82f6",
  color: "white",
  border: "none",
  borderRadius: 7,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  marginTop: 4,
};
