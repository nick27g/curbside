"use client";

import { useState, useEffect, useCallback } from "react";
import MapComponent from "./Map";
import AddLocationForm from "./AddLocationForm";
import { Location } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";

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

export default function MapView() {
  const { profile } = useAuth();
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW);
  const [locations, setLocations] = useState<Location[]>([]);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch("/api/locations");
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
      }
    } catch {
      // silently ignore fetch errors on mount
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ flex: 1 }}>
        <MapComponent
          locations={locations}
          viewState={viewState}
          onViewStateChange={setViewState}
        />
      </div>
      {profile?.role === "driver" && (
        <AddLocationForm onLocationAdded={fetchLocations} />
      )}
    </div>
  );
}
