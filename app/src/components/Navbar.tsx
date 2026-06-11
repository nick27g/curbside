"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const { user, profile, loading, isAdmin, signOut } = useAuth();
  const [activeVendorCount, setActiveVendorCount] = useState<number | null>(null);

  useEffect(() => {
    if (!user || profile?.role !== "customer") { setActiveVendorCount(null); return; }
    fetch("/api/locations")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { if (Array.isArray(data)) setActiveVendorCount(data.length); })
      .catch(() => {});
  }, [user, profile]);

  return (
    <nav className="flex items-center justify-between px-6 py-3 bg-gray-900 text-white">
      <span className="text-xl font-bold tracking-tight">Curbside</span>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {!loading && user ? (
          <>
            {isAdmin && (
              <Link href="/admin" style={{ fontSize: 13, color: "#a78bfa", transition: "color 0.2s" }}>Admin</Link>
            )}
            {profile?.role === "driver" && (
              <span style={{
                fontSize: 11, fontWeight: 600,
                padding: "2px 8px",
                background: profile.status === "approved" ? "#065f46" : "#78350f",
                color: profile.status === "approved" ? "#34d399" : "#fcd34d",
                borderRadius: 4,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
                {profile.status === "approved" ? "Driver ✓" : "Driver · Pending"}
              </span>
            )}
            <span style={{ fontSize: 13, color: "#9ca3af" }}>{user.email}</span>
            <button
              onClick={signOut}
              style={{ fontSize: 13, color: "#f87171", background: "none", border: "1px solid #374151", borderRadius: 6, padding: "4px 10px", cursor: "pointer", transition: "all 0.2s" }}
            >Sign Out</button>
            {/* Role context */}
            {profile?.role === "customer" && activeVendorCount !== null && (
              <span style={{ fontSize: 12, color: activeVendorCount > 0 ? "#34d399" : "#9ca3af", fontWeight: 600 }}>
                {activeVendorCount > 0 ? `🟢 ${activeVendorCount} vendor${activeVendorCount !== 1 ? "s" : ""} active` : "🔴 No vendors active"}
              </span>
            )}
          </>
        ) : !loading ? (
          <>
            <Link href="/auth/login" style={{ fontSize: 13, color: "#9ca3af", transition: "color 0.2s" }}>Sign In</Link>
            <Link href="/auth/signup" style={{ fontSize: 13, color: "white", background: "#8b5cf6", padding: "4px 12px", borderRadius: 6, transition: "all 0.2s" }}>Sign Up</Link>
          </>
        ) : null}
      </div>
    </nav>
  );
}
