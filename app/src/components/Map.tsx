"use client";

import MapGL, { Marker, Source, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import type { FeatureCollection } from "geojson";
import { Location } from "@/lib/types";

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
}

const HARDCODED: Location = {
  id: "hardcoded-1",
  vendor_id: "hardcoded",
  latitude: 41.8827,
  longitude: -87.6233,
  timestamp: "",
  is_active: true,
  heading: null,
  speed: null,
};

export default function MapComponent({ locations, viewState, onViewStateChange, heatmapData, showHeatmap }: MapProps) {
  const allLocations = [HARDCODED, ...locations];

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
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
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
      {allLocations.map((loc) => (
        <Marker key={loc.id} latitude={loc.latitude} longitude={loc.longitude}>
          <div style={{ fontSize: "1.5rem", cursor: "pointer" }} title={`Vendor: ${loc.vendor_id}`}>📍</div>
        </Marker>
      ))}
    </MapGL>
  );
}
