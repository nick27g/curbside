"use client";

import { useState } from "react";
import MapGL, { Marker, Popup, Source, Layer, MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import type { FeatureCollection } from "geojson";
import { Location, Sighting, VendorType } from "@/lib/types";
import { reverseGeocode } from "@/lib/reverseGeocode";

interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

interface MapProps {
  locations: Location[];
  viewState: ViewState;
  onViewStateChange: (vs: ViewState) => void;
  heatmapData?: FeatureCollection | null;
  showHeatmap?: boolean;
  sightings?: Sighting[];
  onSightingVote?: () => void;
  mapRef?: React.RefObject<MapRef | null>;
  destinationCoords?: [number, number] | null;
  customerCoords?: { latitude: number; longitude: number } | null;
}

const VENDOR_PIN: Record<string, { emoji: string; border: string }> = {
  ice_cream_truck: { emoji: "🍦", border: "#8b5cf6" },
  food_truck:      { emoji: "🚚", border: "#f59e0b" },
  hot_dog_cart:    { emoji: "🌭", border: "#f97316" },
  other:           { emoji: "📍", border: "#6366f1" },
};
const DEFAULT_PIN = { emoji: "📍", border: "#6366f1" };

function pinStyle(vendorType: VendorType | null): { emoji: string; border: string } {
  return vendorType ? (VENDOR_PIN[vendorType] ?? DEFAULT_PIN) : DEFAULT_PIN;
}

function vendorTypeLabel(vendorType: VendorType | null): string {
  switch (vendorType) {
    case "ice_cream_truck": return "🍦 Ice Cream Truck";
    case "food_truck":      return "🚚 Food Truck";
    case "hot_dog_cart":    return "🌭 Hot Dog Cart";
    case "other":           return "🛒 Vendor";
    default:                return "📍 Vendor";
  }
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const toRad = (d: number) => d * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function formatRelativeTime(timestamp: string): string {
  const mins = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);
  if (mins < 1) return "Updated just now";
  if (mins === 1) return "Updated 1 min ago";
  if (mins < 60) return `Updated ${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  return `Updated ${hrs} hr${hrs > 1 ? "s" : ""} ago`;
}

function createCircleGeoJSON(center: [number, number], radiusMiles: number): FeatureCollection {
  const [lng, lat] = center;
  const latRadius = radiusMiles / 69.0;
  const lngRadius = radiusMiles / (69.0 * Math.cos(lat * Math.PI / 180));
  const coords: [number, number][] = [];
  for (let i = 0; i <= 64; i++) {
    const angle = (i / 64) * 2 * Math.PI;
    coords.push([lng + lngRadius * Math.cos(angle), lat + latRadius * Math.sin(angle)]);
  }
  return {
    type: "FeatureCollection",
    features: [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [coords] } }],
  };
}

export default function MapComponent({
  locations, viewState, onViewStateChange, heatmapData, showHeatmap,
  sightings = [], onSightingVote, mapRef, destinationCoords, customerCoords,
}: MapProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const [activeSightingId, setActiveSightingId] = useState<string | null>(null);
  const [activeSightingNeighborhood, setActiveSightingNeighborhood] = useState<string | null>(null);
  const [activeLocId, setActiveLocId] = useState<string | null>(null);
  const [popupNeighborhood, setPopupNeighborhood] = useState<string | null>(null);
  const [hoverLocId, setHoverLocId] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);

  const activeLocation = locations.find((l) => l.id === activeLocId) ?? null;
  const hoverLocation = hoverLocId && hoverLocId !== activeLocId
    ? (locations.find((l) => l.id === hoverLocId) ?? null)
    : null;

  async function handleLocationClick(loc: Location) {
    if (activeLocId === loc.id) {
      setActiveLocId(null);
      setPopupNeighborhood(null);
      return;
    }
    setActiveLocId(loc.id);
    setPopupNeighborhood(null);
    const name = await reverseGeocode(loc.latitude, loc.longitude);
    setPopupNeighborhood(name);
  }

  async function handleSightingClick(sightingId: string) {
    if (activeSightingId === sightingId) {
      setActiveSightingId(null);
      setActiveSightingNeighborhood(null);
      return;
    }
    setActiveSightingId(sightingId);
    setActiveSightingNeighborhood(null);
    const sighting = sightings.find((s) => s.id === sightingId);
    if (sighting) {
      const name = await reverseGeocode(sighting.latitude, sighting.longitude);
      setActiveSightingNeighborhood(name);
    }
  }

  if (!token) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6" }}>
        <p style={{ color: "#6b7280", fontSize: 14 }}>Map unavailable — NEXT_PUBLIC_MAPBOX_TOKEN is not set.</p>
      </div>
    );
  }

  const activeSighting = sightings.find((s) => s.id === activeSightingId) ?? null;
  const circleGeoJSON = destinationCoords ? createCircleGeoJSON(destinationCoords, 1) : null;

  async function handleVote(sighting_id: string, action: "confirm" | "dismiss") {
    setVoting(true);
    try {
      await fetch("/api/sightings/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sighting_id, action }),
      });
      onSightingVote?.();
      setActiveSightingId(null);
      setActiveSightingNeighborhood(null);
    } catch {
      // silently ignore
    } finally {
      setVoting(false);
    }
  }

  return (
    <MapGL
      ref={mapRef}
      longitude={viewState.longitude}
      latitude={viewState.latitude}
      zoom={viewState.zoom}
      onMove={(e) => onViewStateChange({
        longitude: e.viewState.longitude,
        latitude: e.viewState.latitude,
        zoom: e.viewState.zoom,
      })}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      mapboxAccessToken={token}
    >
      {showHeatmap && heatmapData && (
        <Source id="route-heatmap" type="geojson" data={heatmapData}>
          <Layer id="route-heatmap-layer" type="heatmap" paint={{ "heatmap-radius": 70, "heatmap-opacity": 0.75, "heatmap-intensity": 1 }} />
        </Source>
      )}

      {/* ── Destination radius ring ── */}
      {circleGeoJSON && (
        <Source id="destination-ring" type="geojson" data={circleGeoJSON}>
          <Layer id="destination-ring-fill" type="fill" paint={{ "fill-color": "#ef4444", "fill-opacity": 0.08 }} />
          <Layer id="destination-ring-border" type="line" paint={{ "line-color": "#ef4444", "line-opacity": 0.4, "line-width": 2 }} />
        </Source>
      )}

      {/* ── Destination marker ── */}
      {destinationCoords && (
        <Marker latitude={destinationCoords[1]} longitude={destinationCoords[0]}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#ef4444", border: "3px solid #dc2626", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, boxShadow: "0 2px 8px rgba(239,68,68,0.5)", cursor: "default" }}>📌</div>
        </Marker>
      )}

      {/* ── Vendor pins ── */}
      {locations.map((loc) => {
        const { emoji, border } = pinStyle(loc.vendor_type);
        return (
          <Marker key={loc.id} latitude={loc.latitude} longitude={loc.longitude}>
            <div
              style={{ width: 36, height: 36, borderRadius: "50%", background: "white", border: `3px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: "0 2px 6px rgba(0,0,0,0.25)", cursor: "pointer", transition: "transform 0.15s" }}
              onClick={() => handleLocationClick(loc)}
              onMouseEnter={() => setHoverLocId(loc.id)}
              onMouseLeave={() => setHoverLocId(null)}
            >{emoji}</div>
          </Marker>
        );
      })}

      {/* ── Vendor hover tooltip ── */}
      {hoverLocation && (
        <Popup latitude={hoverLocation.latitude} longitude={hoverLocation.longitude} closeButton={false} anchor="top" offset={22} focusAfterOpen={false}>
          <div style={{ fontSize: 12, padding: "2px 4px", whiteSpace: "nowrap", pointerEvents: "none" }}>
            {vendorTypeLabel(hoverLocation.vendor_type)}
          </div>
        </Popup>
      )}

      {/* ── Vendor click popup ── */}
      {activeLocation && (
        <Popup latitude={activeLocation.latitude} longitude={activeLocation.longitude} onClose={() => { setActiveLocId(null); setPopupNeighborhood(null); }} closeButton anchor="bottom">
          <div className="p-2 min-w-[170px]">
            <p className="font-semibold text-sm text-gray-800">{vendorTypeLabel(activeLocation.vendor_type)}</p>
            <p className="text-xs text-gray-500 mt-0.5">{popupNeighborhood ?? "Locating…"}</p>
            {customerCoords && (
              <p className="text-xs text-gray-400 mt-0.5">
                {haversineDistance(customerCoords.latitude, customerCoords.longitude, activeLocation.latitude, activeLocation.longitude).toFixed(1)} miles away
              </p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">{formatRelativeTime(activeLocation.timestamp)}</p>
          </div>
        </Popup>
      )}

      {/* ── Sighting pins ── */}
      {sightings.map((s) => (
        <Marker key={s.id} latitude={s.latitude} longitude={s.longitude} onClick={() => handleSightingClick(s.id)}>
          <div className="w-4 h-4 rounded-full bg-amber-400 border-2 border-amber-600 cursor-pointer" title="Unverified sighting" />
        </Marker>
      ))}

      {/* ── Sighting popup ── */}
      {activeSighting && (
        <Popup latitude={activeSighting.latitude} longitude={activeSighting.longitude} onClose={() => { setActiveSightingId(null); setActiveSightingNeighborhood(null); }} closeButton anchor="bottom">
          <div className="p-2 min-w-[180px]">
            <p className="font-semibold text-sm text-gray-800">{activeSighting.vendor_type ?? "Unknown vendor"}</p>
            {activeSightingNeighborhood && <p className="text-xs text-gray-400 mt-0.5">{activeSightingNeighborhood}</p>}
            {activeSighting.description && <p className="text-xs text-gray-600 mt-0.5">{activeSighting.description}</p>}
            <div className="flex gap-3 mt-1.5 text-xs text-gray-500">
              <span>✓ {activeSighting.confirmed_count} confirmed</span>
              <span>✗ {activeSighting.dismissed_count} dismissed</span>
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => handleVote(activeSighting.id, "confirm")} disabled={voting} className="flex-1 bg-green-100 hover:bg-green-200 text-green-800 text-xs font-semibold rounded px-2 py-1 disabled:opacity-50">Confirm</button>
              <button onClick={() => handleVote(activeSighting.id, "dismiss")} disabled={voting} className="flex-1 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold rounded px-2 py-1 disabled:opacity-50">Dismiss</button>
            </div>
          </div>
        </Popup>
      )}
    </MapGL>
  );
}
