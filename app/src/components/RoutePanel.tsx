"use client";

import { useState } from "react";

interface Suggestion {
  zone: string;
  time_window: string;
  reason: string;
}

interface Props {
  driverCoords: { latitude: number; longitude: number } | null;
  targetLocation?: string | null;
}

const TIER_LABELS: Record<number, string> = {
  1: "Based on time & location",
  2: "Based on your route history",
  3: "Based on your full route patterns",
};

export default function RoutePanel({ driverCoords, targetLocation }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState<number | null>(null);

  async function handleFetch() {
    if (!driverCoords) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/route-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...driverCoords, targetLocation: targetLocation ?? null }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong");
        return;
      }
      setSuggestions(json.suggestions);
      setTier(json.tier);
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  const disabled = !driverCoords || loading;

  return (
    <div style={{ padding: "12px 16px", background: "#111827", borderTop: "1px solid #374151", display: "flex", flexDirection: "column", gap: 10 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {/* ── Button row ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          type="button"
          onClick={handleFetch}
          disabled={disabled}
          style={{
            padding: "8px 18px",
            background: disabled ? "#374151" : "#7c3aed",
            color: disabled ? "#6b7280" : "white",
            border: "none",
            borderRadius: 6,
            cursor: disabled ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 600,
            transition: "background 0.15s",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {loading && (
            <span style={{
              width: 12,
              height: 12,
              border: "2px solid rgba(255,255,255,0.3)",
              borderTopColor: "white",
              borderRadius: "50%",
              display: "inline-block",
              animation: "spin 0.7s linear infinite",
            }} />
          )}
          {loading ? "Thinking…" : !driverCoords ? "Tracking required" : "Get Route Suggestion"}
        </button>
        {tier !== null && !loading && (
          <span style={{ color: "#9ca3af", fontSize: 11 }}>{TIER_LABELS[tier]}</span>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{error}</p>
      )}

      {/* ── Suggestion cards ── */}
      {suggestions && suggestions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflowY: "auto" }}>
          {suggestions.map((s, i) => (
            <div
              key={i}
              style={{
                background: "#1f2937",
                border: "1px solid #374151",
                borderRadius: 8,
                padding: "10px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <span style={{ color: "white", fontSize: 14, fontWeight: 700 }}>{s.zone}</span>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(s.zone + ", Chicago, IL")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flexShrink: 0,
                    fontSize: 11,
                    color: "#9ca3af",
                    textDecoration: "none",
                    padding: "2px 7px",
                    border: "1px solid #374151",
                    borderRadius: 4,
                    whiteSpace: "nowrap",
                  }}
                >
                  🗺️ Navigate
                </a>
              </div>
              <span style={{ color: "#818cf8", fontSize: 11, fontWeight: 500 }}>{s.time_window}</span>
              <span style={{ color: "#d1d5db", fontSize: 13 }}>{s.reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
