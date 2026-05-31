"use client";

import MapGL, { Marker } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
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
}

const HARDCODED: Location = {
  id: "hardcoded-1",
  vendor_id: "hardcoded",
  latitude: 41.8827,
  longitude: -87.6233,
  label: "Chicago Food Truck",
  created_at: "",
};

export default function MapComponent({ locations, viewState, onViewStateChange }: MapProps) {
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
      {allLocations.map((loc) => (
        <Marker key={loc.id} latitude={loc.latitude} longitude={loc.longitude}>
          <div style={{ fontSize: "1.5rem", cursor: "pointer" }} title={loc.label}>📍</div>
        </Marker>
      ))}
    </MapGL>
  );
}
