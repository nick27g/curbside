"use client";

import { useState, useEffect, useCallback } from "react";
import MapComponent from "./Map";
import AddLocationForm from "./AddLocationForm";
import { Location } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

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
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW);
  const [locations, setLocations] = useState<Location[]>([]);

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

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

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
          setLocations((prev) => upsertByVendor(prev, payload.new as Location));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ flex: 1 }}>
        <MapComponent
          locations={locations}
          viewState={viewState}
          onViewStateChange={setViewState}
        />
      </div>
      {!loading && profile?.role === "driver" && (
        <AddLocationForm onLocationAdded={fetchLocations} />
      )}
    </div>
  );
}
