import { useState } from "react";
import MapPlaceholder from "../../components/map/MapPlaceholder";

export default function CitizenHome() {
  const [location, setLocation] = useState(null);

  return (
    <div style={{ padding: 20 }}>
      <h2>Citizen Rescue Request</h2>

      <MapPlaceholder onSelectLocation={setLocation} />

      {location && (
        <div style={{ marginTop: 20 }}>
          <h3>Location selected:</h3>
          <p>
            Lat: {location.lat} — Lng: {location.lng}
          </p>
        </div>
      )}
    </div>
  );
}
