"use client";

import { useState } from "react";
import MapGL, { Marker, Popup, Source, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import type { FeatureCollection } from "geojson";
import { Location, Sighting } from "@/lib/types";

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
}

export default function MapComponent({ locations, viewState, onViewStateChange, heatmapData, showHeatmap, sightings = [], onSightingVote }: MapProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const [activeSightingId, setActiveSightingId] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);

  if (!token) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6" }}>
        <p style={{ color: "#6b7280", fontSize: 14 }}>Map unavailable — NEXT_PUBLIC_MAPBOX_TOKEN is not set.</p>
      </div>
    );
  }

  const activeSighting = sightings.find((s) => s.id === activeSightingId) ?? null;

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
    } catch {
      // silently ignore
    } finally {
      setVoting(false);
    }
  }

  return (
    <MapGL
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
          <Layer
            id="route-heatmap-layer"
            type="heatmap"
            paint={{
              "heatmap-radius": 70,
              "heatmap-opacity": 0.75,
              "heatmap-intensity": 1,
            }}
          />
        </Source>
      )}
      {locations.map((loc) => (
        <Marker key={loc.id} latitude={loc.latitude} longitude={loc.longitude}>
          <div style={{ fontSize: "1.5rem", cursor: "pointer" }} title={`Vendor: ${loc.vendor_id}`}>📍</div>
        </Marker>
      ))}
      {sightings.map((s) => (
        <Marker
          key={s.id}
          latitude={s.latitude}
          longitude={s.longitude}
          onClick={() => setActiveSightingId((prev) => (prev === s.id ? null : s.id))}
        >
          <div
            className="w-4 h-4 rounded-full bg-amber-400 border-2 border-amber-600 cursor-pointer"
            title="Unverified sighting"
          />
        </Marker>
      ))}
      {activeSighting && (
        <Popup
          latitude={activeSighting.latitude}
          longitude={activeSighting.longitude}
          onClose={() => setActiveSightingId(null)}
          closeButton
          anchor="bottom"
        >
          <div className="p-2 min-w-[180px]">
            <p className="font-semibold text-sm text-gray-800">
              {activeSighting.vendor_type ?? "Unknown vendor"}
            </p>
            {activeSighting.description && (
              <p className="text-xs text-gray-600 mt-0.5">{activeSighting.description}</p>
            )}
            <div className="flex gap-3 mt-1.5 text-xs text-gray-500">
              <span>✓ {activeSighting.confirmed_count} confirmed</span>
              <span>✗ {activeSighting.dismissed_count} dismissed</span>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleVote(activeSighting.id, "confirm")}
                disabled={voting}
                className="flex-1 bg-green-100 hover:bg-green-200 text-green-800 text-xs font-semibold rounded px-2 py-1 disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                onClick={() => handleVote(activeSighting.id, "dismiss")}
                disabled={voting}
                className="flex-1 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold rounded px-2 py-1 disabled:opacity-50"
              >
                Dismiss
              </button>
            </div>
          </div>
        </Popup>
      )}
    </MapGL>
  );
}
