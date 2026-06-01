export interface Location {
  id: string;
  vendor_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  is_active: boolean;
  heading: number | null;
  speed: number | null;
}

export interface Profile {
  id: string;
  role: "driver" | "customer";
  status: "pending" | "approved" | "rejected";
  is_admin: boolean;
  created_at: string;
}
