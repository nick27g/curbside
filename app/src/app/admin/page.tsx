"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Profile } from "@/lib/types";

interface DriverRow extends Profile {
  email: string | null;
}

export default function AdminPage() {
  const { loading: authLoading } = useAuth();
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    fetch("/api/admin/drivers")
      .then((r) => r.json())
      .then((data) => {
        setDrivers(Array.isArray(data) ? data : []);
        setFetching(false);
      });
  }, [authLoading]);

  async function updateStatus(id: string, status: "approved" | "rejected") {
    const res = await fetch(`/api/admin/drivers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setDrivers((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: updated.status } : d))
      );
    }
  }

  if (authLoading || fetching) {
    return (
      <div style={{ padding: 40, color: "#9ca3af", fontSize: 14 }}>
        Loading drivers…
      </div>
    );
  }

  return (
    <div style={{ padding: 32 }}>
      <h1
        style={{
          color: "white",
          fontSize: 22,
          fontWeight: 700,
          margin: "0 0 24px",
        }}
      >
        Driver Verification
      </h1>

      {drivers.length === 0 ? (
        <p style={{ color: "#6b7280", fontSize: 14 }}>
          No drivers registered yet.
        </p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #374151" }}>
              {["Email", "Status", "Joined", "Actions"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "8px 12px",
                    color: "#9ca3af",
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver) => (
              <tr
                key={driver.id}
                style={{ borderBottom: "1px solid #1f2937" }}
              >
                <td style={cellStyle}>{driver.email ?? driver.id}</td>
                <td style={cellStyle}>
                  <StatusBadge status={driver.status} />
                </td>
                <td style={cellStyle}>
                  {new Date(driver.created_at).toLocaleDateString()}
                </td>
                <td style={{ ...cellStyle, display: "flex", gap: 8 }}>
                  <button
                    onClick={() => updateStatus(driver.id, "approved")}
                    disabled={driver.status === "approved"}
                    style={actionBtn(
                      "#065f46",
                      "#34d399",
                      driver.status === "approved"
                    )}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => updateStatus(driver.id, "rejected")}
                    disabled={driver.status === "rejected"}
                    style={actionBtn(
                      "#7f1d1d",
                      "#f87171",
                      driver.status === "rejected"
                    )}
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, [string, string]> = {
    pending: ["#78350f", "#fcd34d"],
    approved: ["#065f46", "#34d399"],
    rejected: ["#7f1d1d", "#f87171"],
  };
  const [bg, fg] = colors[status] ?? ["#374151", "#9ca3af"];
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        background: bg,
        color: fg,
        borderRadius: 4,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {status}
    </span>
  );
}

const cellStyle: React.CSSProperties = {
  padding: "12px",
  color: "#e5e7eb",
  fontSize: 13,
  verticalAlign: "middle",
};

function actionBtn(
  bg: string,
  color: string,
  disabled: boolean
): React.CSSProperties {
  return {
    padding: "5px 12px",
    background: disabled ? "#1f2937" : bg,
    color: disabled ? "#4b5563" : color,
    border: `1px solid ${disabled ? "#374151" : color}`,
    borderRadius: 5,
    fontSize: 12,
    fontWeight: 500,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}
