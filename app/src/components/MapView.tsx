"use client";

import { useState } from "react";
import MapComponent from "./Map";
import { Location } from "@/lib/types";

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
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW);
  const locations: Location[] = [];

  return (
    <div style={{ flex: 1 }}>
      <MapComponent
        locations={locations}
        viewState={viewState}
        onViewStateChange={setViewState}
      />
    </div>
  );
}
