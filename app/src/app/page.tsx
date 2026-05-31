import Navbar from "@/components/Navbar";
import MapView from "@/components/MapView";

export default function Home() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Navbar />
      <MapView />
    </div>
  );
}
