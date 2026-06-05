"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const { user, profile, loading, isAdmin, signOut } = useAuth();

  return (
    <nav className="flex items-center justify-between px-6 py-3 bg-gray-900 text-white">
      <span className="text-xl font-bold tracking-tight">Curbside</span>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {!loading && user ? (
          <>
            {isAdmin && (
              <Link href="/admin" style={{ fontSize: 13, color: "#a78bfa" }}>
                Admin
              </Link>
            )}
            {profile?.role === "driver" && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  background: "#065f46",
                  color: "#34d399",
                  borderRadius: 4,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Driver
              </span>
            )}
            <span style={{ fontSize: 13, color: "#9ca3af" }}>{user.email}</span>
            <button
              onClick={signOut}
              style={{
                fontSize: 13,
                color: "#f87171",
                background: "none",
                border: "1px solid #374151",
                borderRadius: 6,
                padding: "4px 10px",
                cursor: "pointer",
              }}
            >
              Sign Out
            </button>
          </>
        ) : !loading ? (
          <>
            <Link href="/auth/login" style={{ fontSize: 13, color: "#60a5fa" }}>
              Login
            </Link>
            <Link
              href="/auth/signup"
              style={{
                fontSize: 13,
                color: "white",
                background: "#3b82f6",
                padding: "4px 12px",
                borderRadius: 6,
              }}
            >
              Sign Up
            </Link>
          </>
        ) : null}
        <span className="text-sm text-gray-400" style={{ marginLeft: 8 }}>
          Sprint 5.3 — AI Route Suggestions
        </span>
      </div>
    </nav>
  );
}
