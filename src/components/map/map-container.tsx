"use client";

import { GoogleMapView } from "./google-map";
import type { StopWithPhotos } from "@/lib/types";

interface MapContainerProps {
  stops: StopWithPhotos[];
  selectedStopId: string | null;
  onStopClick: (stopId: string) => void;
  onMapClick: (lat: number, lng: number) => void;
}

export function MapContainer({
  stops,
  selectedStopId,
  onStopClick,
  onMapClick,
}: MapContainerProps) {
  return (
    <div className="relative w-full h-full">
      <GoogleMapView
        stops={stops}
        selectedStopId={selectedStopId}
        onStopClick={onStopClick}
        onMapClick={onMapClick}
      />
    </div>
  );
}
