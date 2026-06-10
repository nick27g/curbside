"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { reverseGeocode } from "@/lib/reverseGeocode";

interface GeocodingFeature {
  id: string;
  place_name: string;
  center: [number, number];
}

interface Props {
  onLocationAdded: () => void;
  onCoordsChange?: (coords: { latitude: number; longitude: number } | null) => void;
  flyTo?: (center: [number, number]) => void;
  onTargetLocationChange?: (place: string | null) => void;
}

export default function AddLocationForm({ onLocationAdded, onCoordsChange, flyTo, onTargetLocationChange }: Props) {
  const { profile, loading: authLoading } = useAuth();
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const [neighborhood, setNeighborhood] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodingFeature[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [targetLocation, setTargetLocation] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const routeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const lastGeocodedPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (routeIntervalRef.current) clearInterval(routeIntervalRef.current);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!value.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) return;
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?proximity=-87.6298,41.8781&bbox=-88.0,41.6,-87.5,42.1&access_token=${token}`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (data.features ?? []).slice(0, 5).map((f: any) => ({
              id: f.id,
              place_name: f.place_name,
              center: f.center,
            }))
          );
          setShowResults(true);
        }
      } catch {
        // silently ignore
      }
    }, 300);
  }

  function handleSelectResult(feature: GeocodingFeature) {
    const shortName = feature.place_name.split(",").slice(0, 2).join(",").trim();
    setSearchQuery(feature.place_name.split(",")[0].trim());
    setShowResults(false);
    setSearchResults([]);
    setTargetLocation(shortName);
    onTargetLocationChange?.(shortName);
    flyTo?.(feature.center);
  }

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
          const last = lastGeocodedPosRef.current;
          if (!last || Math.hypot(latitude - last.lat, longitude - last.lng) > 0.0009) {
            lastGeocodedPosRef.current = { lat: latitude, lng: longitude };
            reverseGeocode(latitude, longitude).then(setNeighborhood);
          }
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
    setNeighborhood(null);
    setTargetLocation(null);
    onTargetLocationChange?.(null);
    lastGeocodedPosRef.current = null;
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
    <div style={{ background: "#1f2937", borderTop: "1px solid #374151", display: "flex", flexDirection: "column" }}>
      {/* ── Location search ── */}
      <div style={{ padding: "10px 16px", borderBottom: "1px solid #374151" }}>
        <div style={{ position: "relative" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onBlur={() => setTimeout(() => setShowResults(false), 150)}
            onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
            placeholder="Search neighborhoods & places…"
            style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
          />
          {showResults && searchResults.length > 0 && (
            <div style={{
              position: "absolute",
              bottom: "calc(100% + 4px)",
              left: 0,
              right: 0,
              background: "#1f2937",
              border: "1px solid #4b5563",
              borderRadius: 6,
              zIndex: 20,
              overflow: "hidden",
            }}>
              {searchResults.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onMouseDown={() => handleSelectResult(r)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 12px",
                    background: "none",
                    border: "none",
                    borderBottom: "1px solid #374151",
                    color: "#d1d5db",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {r.place_name}
                </button>
              ))}
            </div>
          )}
        </div>
        {targetLocation && (
          <p style={{ color: "#60a5fa", fontSize: 12, margin: "6px 0 0" }}>
            Heading to: {targetLocation}
          </p>
        )}
      </div>
    <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
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
            GPS active{neighborhood ? ` — ${neighborhood}` : ""}
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
