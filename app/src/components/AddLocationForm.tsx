"use client";

import { useState } from "react";

interface Props {
  onLocationAdded: () => void;
}

export default function AddLocationForm({ onLocationAdded }: Props) {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

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
    <div style={{ padding: "12px 16px", background: "#1f2937", borderTop: "1px solid #374151" }}>
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
