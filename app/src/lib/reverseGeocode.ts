export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return "Chicago area";
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=neighborhood,locality&access_token=${token}`
    );
    if (!res.ok) return "Chicago area";
    const data = await res.json();
    return (data.features?.[0]?.place_name as string) ?? "Chicago area";
  } catch {
    return "Chicago area";
  }
}
