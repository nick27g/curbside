"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

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
      <h1 style={headingStyle}>Sign In</h1>
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
            autoComplete="current-password"
            style={inputStyle}
          />
        </div>
        {error && <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{error}</p>}
        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
      <p style={{ marginTop: 18, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
        No account?{" "}
        <Link href="/auth/signup" style={{ color: "#60a5fa" }}>
          Sign up
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
