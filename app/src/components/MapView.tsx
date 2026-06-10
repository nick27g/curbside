"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { FeatureCollection } from "geojson";
import MapComponent from "./Map";
import AddLocationForm from "./AddLocationForm";
import RoutePanel from "./RoutePanel";
import { Location, Sighting } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { MapRef } from "react-map-gl/mapbox";

interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

const INITIAL_VIEW: ViewState = {
  longitude: -87.6298,
  latitude: 41.8781,
  zoom: 12,
};

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// Keeps one pin per vendor — replaces with the newer row, removes if inactive.
function upsertByVendor(prev: Location[], incoming: Location): Location[] {
  if (!incoming.is_active) {
    return prev.filter((l) => l.vendor_id !== incoming.vendor_id);
  }
  const idx = prev.findIndex((l) => l.vendor_id === incoming.vendor_id);
  if (idx === -1) return [...prev, incoming];
  if (incoming.timestamp >= prev[idx].timestamp) {
    const next = [...prev];
    next[idx] = incoming;
    return next;
  }
  return prev;
}

export default function MapView() {
  const { profile, loading } = useAuth();
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW);
  const [targetLocation, setTargetLocation] = useState<string | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [heatmapData, setHeatmapData] = useState<FeatureCollection | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [driverCoords, setDriverCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [customerCoords, setCustomerCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [nearbyVendor, setNearbyVendor] = useState<Location | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [sightingFormOpen, setSightingFormOpen] = useState(false);
  const [sightingVendorType, setSightingVendorType] = useState("");
  const [sightingDescription, setSightingDescription] = useState("");
  const [sightingError, setSightingError] = useState<string | null>(null);
  const [sightingSubmitting, setSightingSubmitting] = useState(false);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const sightingsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch("/api/locations");
      if (res.ok) {
        const data: Location[] = await res.json();
        // One pin per vendor — keep the latest active row.
        const latestByVendor = new Map<string, Location>();
        for (const loc of data) {
          if (!loc.is_active) continue;
          const existing = latestByVendor.get(loc.vendor_id);
          if (!existing || loc.timestamp > existing.timestamp) {
            latestByVendor.set(loc.vendor_id, loc);
          }
        }
        setLocations(Array.from(latestByVendor.values()));
      }
    } catch {
      // silently ignore fetch errors on mount
    }
  }, []);

  const fetchSightings = useCallback(async () => {
    try {
      const res = await fetch("/api/sightings");
      if (res.ok) {
        const data: Sighting[] = await res.json();
        setSightings(data);
      }
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    fetchSightings();
    sightingsIntervalRef.current = setInterval(fetchSightings, 60_000);
    return () => {
      if (sightingsIntervalRef.current !== null) clearInterval(sightingsIntervalRef.current);
    };
  }, [fetchSightings]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("locations-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "locations" },
        (payload) => {
          setLocations((prev) => upsertByVendor(prev, payload.new as Location));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "locations" },
        (payload) => {
          const loc = payload.new as Location;
          if (!loc.vendor_id) return;
          if (!loc.is_active) {
            setLocations((prev) => prev.filter((l) => l.vendor_id !== loc.vendor_id));
          } else {
            setLocations((prev) => upsertByVendor(prev, loc));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "locations" },
        (payload) => {
          // Supabase fires DELETE (not UPDATE) when RLS makes the post-update row
          // invisible to the subscriber — e.g. is_active flips to false and the
          // SELECT policy only exposes active rows. payload.old has at minimum the PK.
          const old = payload.old as Partial<Location>;
          if (old.vendor_id) {
            setLocations((prev) => prev.filter((l) => l.vendor_id !== old.vendor_id));
          } else if (old.id) {
            setLocations((prev) => prev.filter((l) => l.id !== old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (loading || profile?.role !== "customer") return;
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setCustomerCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => {}
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [loading, profile]);

  useEffect(() => {
    if (profile?.role !== "customer" || !customerCoords) {
      setNearbyVendor(null);
      return;
    }
    let closest: Location | null = null;
    let closestDist = Infinity;
    for (const loc of locations) {
      const dist = haversineDistance(
        customerCoords.latitude,
        customerCoords.longitude,
        loc.latitude,
        loc.longitude
      );
      if (dist <= 0.5 && dist < closestDist) {
        closest = loc;
        closestDist = dist;
      }
    }
    setNearbyVendor(closest);
  }, [customerCoords, locations, profile]);

  useEffect(() => {
    if (nearbyVendor !== null) setDismissed(false);
  }, [nearbyVendor]);

  useEffect(() => {
    if (loading || profile?.role !== "driver") return;
    fetch("/api/route-points/heatmap")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setHeatmapData(data); })
      .catch(() => {});
  }, [loading, profile]);

  const flyTo = useCallback((center: [number, number]) => {
    mapRef.current?.flyTo({ center, zoom: 14 });
  }, []);

  const isDriver = !loading && profile?.role === "driver";
  const isApprovedDriver = isDriver && profile?.status === "approved";
  const isCustomer = !loading && profile?.role === "customer";

  async function handleSightingSubmit() {
    if (!customerCoords) {
      setSightingError("Location unavailable — enable location access.");
      return;
    }
    setSightingSubmitting(true);
    setSightingError(null);
    try {
      const res = await fetch("/api/sightings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: customerCoords.latitude,
          longitude: customerCoords.longitude,
          vendor_type: sightingVendorType || undefined,
          description: sightingDescription || undefined,
        }),
      });
      if (res.status === 429) {
        setSightingError("You've reported 3 sightings this hour. Try again later.");
        return;
      }
      if (!res.ok) {
        const body = await res.json();
        setSightingError(body.error ?? "Something went wrong.");
        return;
      }
      setSightingFormOpen(false);
      setSightingVendorType("");
      setSightingDescription("");
      fetchSightings();
    } catch {
      setSightingError("Something went wrong.");
    } finally {
      setSightingSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <MapComponent
          mapRef={mapRef}
          locations={locations}
          viewState={viewState}
          onViewStateChange={setViewState}
          heatmapData={heatmapData}
          showHeatmap={showHeatmap}
          sightings={sightings}
          onSightingVote={fetchSightings}
        />
        {isCustomer && locations.length === 0 && (
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(4px)",
            borderRadius: 12,
            padding: "14px 20px",
            pointerEvents: "none",
            textAlign: "center",
          }}>
            <p style={{ margin: 0, fontSize: 14, color: "#374151", fontWeight: 500 }}>
              No vendors are active right now. Check back soon! 🍦
            </p>
          </div>
        )}
        {nearbyVendor !== null && !dismissed && (
          <div className="absolute top-0 left-0 right-0 z-10 bg-amber-100 text-amber-900 shadow-md rounded-b-lg px-4 py-3 flex items-start justify-between">
            <div>
              <p className="font-semibold text-sm">🛒 A vendor is nearby!</p>
              <p className="text-xs text-amber-700 mt-0.5">{nearbyVendor.vendor_id}</p>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="ml-4 text-lg font-bold leading-none text-amber-700 hover:text-amber-900"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}
        {isCustomer && (
          <div className="absolute bottom-4 left-4 z-10">
            {sightingFormOpen && (
              <div className="bg-white rounded-lg shadow-lg p-3 mb-2 w-64">
                <input
                  type="text"
                  value={sightingVendorType}
                  onChange={(e) => setSightingVendorType(e.target.value)}
                  placeholder="What kind of vendor? e.g. ice cream truck"
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                <input
                  type="text"
                  value={sightingDescription}
                  onChange={(e) => setSightingDescription(e.target.value)}
                  placeholder="Any details? e.g. playing music on Main St"
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                {sightingError && (
                  <p className="text-red-600 text-xs mb-2">{sightingError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleSightingSubmit}
                    disabled={sightingSubmitting}
                    className="flex-1 bg-amber-400 hover:bg-amber-500 text-amber-900 font-semibold text-sm rounded px-3 py-1.5 disabled:opacity-50"
                  >
                    Submit
                  </button>
                  <button
                    onClick={() => {
                      setSightingFormOpen(false);
                      setSightingVendorType("");
                      setSightingDescription("");
                      setSightingError(null);
                    }}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded px-3 py-1.5"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={() => setSightingFormOpen((v) => !v)}
              className="bg-amber-400 hover:bg-amber-500 text-amber-900 font-semibold rounded shadow px-4 py-2 text-sm"
            >
              Report Sighting
            </button>
          </div>
        )}
        {isDriver && (
          <button
            onClick={() => setShowHeatmap((v) => !v)}
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              padding: "6px 14px",
              background: showHeatmap ? "#7c3aed" : "#374151",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              zIndex: 1,
            }}
          >
            {showHeatmap ? "Hide Heat Map" : "Show Heat Map"}
          </button>
        )}
        {isDriver && (
          <div style={{ position: "absolute", bottom: 0, right: 0, zIndex: 1, width: 360 }}>
            <AddLocationForm
              onLocationAdded={fetchLocations}
              onCoordsChange={setDriverCoords}
              flyTo={flyTo}
              onTargetLocationChange={setTargetLocation}
            />
            {isApprovedDriver && (
              <RoutePanel driverCoords={driverCoords} targetLocation={targetLocation} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
