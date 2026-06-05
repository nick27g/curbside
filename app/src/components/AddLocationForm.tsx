"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

interface Props {
  onLocationAdded: () => void;
  onCoordsChange?: (coords: { latitude: number; longitude: number } | null) => void;
}

export default function AddLocationForm({ onLocationAdded, onCoordsChange }: Props) {
  const { profile, loading: authLoading } = useAuth();
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const routeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (routeIntervalRef.current) clearInterval(routeIntervalRef.current);
    };
  }, []);

  async function startTracking() {
    if (!navigator.geolocation) {
      console.error("[GPS] Geolocation not supported by this browser.");
      return;
    }
    setIsTracking(true);

    // Start route session and store the ID for the 30s interval.
    try {
      const res = await fetch("/api/route-sessions/start", { method: "POST" });
      if (res.ok) {
        const { id } = await res.json();
        sessionIdRef.current = id;
        console.log("[Route] Session started:", id);
      }
    } catch (err) {
      console.error("[Route] Failed to start session:", err);
    }

    // 5s live-tracking interval (unchanged).
    const tick = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          console.log("[GPS]", latitude, longitude, "accuracy:", pos.coords.accuracy + "m");
          onCoordsChange?.({ latitude, longitude });
          try {
            await fetch("/api/locations/create", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ latitude, longitude, is_active: true }),
            });
          } catch (err) {
            console.error("[GPS] Failed to write location:", err);
          }
        },
        (err) => {
          console.error("[GPS error]", err.message);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    };
    tick();
    intervalRef.current = setInterval(tick, 5000);

    // 30s historical route-point interval.
    const routeTick = () => {
      if (!sessionIdRef.current) return;
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          try {
            await fetch("/api/route-points/create", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ session_id: sessionIdRef.current, latitude, longitude }),
            });
          } catch (err) {
            console.error("[Route] Failed to write route point:", err);
          }
        },
        (err) => {
          console.error("[Route GPS error]", err.message);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    };
    routeTick();
    routeIntervalRef.current = setInterval(routeTick, 30000);
  }

  async function stopTracking() {
    setIsTracking(false);
    onCoordsChange?.(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (routeIntervalRef.current) {
      clearInterval(routeIntervalRef.current);
      routeIntervalRef.current = null;
    }
    console.log("[GPS] Tracking stopped.");
    try {
      await fetch("/api/locations/deactivate", { method: "PATCH" });
    } catch (err) {
      console.error("[GPS] Failed to deactivate location:", err);
    }
    if (sessionIdRef.current) {
      try {
        await fetch("/api/route-sessions/stop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionIdRef.current }),
        });
        console.log("[Route] Session stopped:", sessionIdRef.current);
      } catch (err) {
        console.error("[Route] Failed to stop session:", err);
      }
      sessionIdRef.current = null;
    }
  }

  if (authLoading) return null;
  if (profile?.role !== "driver") return null;

  if (profile.status === "pending") {
    return (
      <div style={{ padding: "12px 16px", background: "#1f2937", borderTop: "1px solid #374151" }}>
        <p style={{ color: "#fcd34d", fontSize: 13, margin: 0 }}>
          Your account is pending admin approval. You&apos;ll be notified when approved.
        </p>
      </div>
    );
  }

  if (profile.status === "rejected") {
    return (
      <div style={{ padding: "12px 16px", background: "#1f2937", borderTop: "1px solid #374151" }}>
        <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>
          Your account has not been approved. Please contact support.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/locations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(json.error ?? "Something went wrong");
        return;
      }

      setStatus("success");
      setMessage(`Location added at (${json.latitude}, ${json.longitude})`);
      setLatitude("");
      setLongitude("");
      onLocationAdded();
    } catch {
      setStatus("error");
      setMessage("Network error");
    }
  }

  return (
    <div style={{ padding: "12px 16px", background: "#1f2937", borderTop: "1px solid #374151", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          type="button"
          onClick={isTracking ? stopTracking : startTracking}
          style={{
            padding: "8px 20px",
            background: isTracking ? "#dc2626" : "#16a34a",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {isTracking ? "Stop Tracking" : "Start Tracking"}
        </button>
        {isTracking && (
          <span style={{ color: "#34d399", fontSize: 12 }}>
            GPS active — logging coordinates every 5s (check console)
          </span>
        )}
      </div>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ color: "#9ca3af", fontSize: 11 }}>Latitude</label>
          <input
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            placeholder="41.8827"
            required
            style={inputStyle}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ color: "#9ca3af", fontSize: 11 }}>Longitude</label>
          <input
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            placeholder="-87.6233"
            required
            style={inputStyle}
          />
        </div>
        <button
          type="submit"
          disabled={status === "loading"}
          style={{
            padding: "8px 16px",
            background: status === "loading" ? "#4b5563" : "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: status === "loading" ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {status === "loading" ? "Adding…" : "Add Location"}
        </button>
        {message && (
          <span style={{ color: status === "success" ? "#34d399" : "#f87171", fontSize: 13, alignSelf: "center" }}>
            {message}
          </span>
        )}
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "7px 10px",
  background: "#374151",
  color: "white",
  border: "1px solid #4b5563",
  borderRadius: 6,
  fontSize: 13,
  width: 120,
  outline: "none",
};
