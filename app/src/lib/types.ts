export type VendorType = 'ice_cream_truck' | 'food_truck' | 'hot_dog_cart' | 'other';

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

export interface Sighting {
  id: string;
  reported_by: string;
  latitude: number;
  longitude: number;
  vendor_type: string | null;
  description: string | null;
  confirmed_count: number;
  dismissed_count: number;
  expires_at: string;
  created_at: string;
}

export interface Profile {
  id: string;
  role: "driver" | "customer";
  status: "pending" | "approved" | "rejected";
  is_admin: boolean;
  created_at: string;
  vendor_type: VendorType | null;
}
