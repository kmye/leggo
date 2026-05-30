"use client";

import { GoogleMapView } from "./google-map";
import type { StopWithPhotos } from "@/lib/types";

export function ReadOnlyMap({ stops }: { stops: StopWithPhotos[] }) {
  return (
    <div className="relative w-full h-full">
      <GoogleMapView
        stops={stops}
        selectedStopId={null}
        onStopClick={() => {}}
        onMapClick={() => {}}
      />
    </div>
  );
}
