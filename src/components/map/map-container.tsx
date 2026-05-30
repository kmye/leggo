"use client";

import { GoogleMapView } from "./google-map";
import type { StopWithPhotos, PlaceResult } from "@/lib/types";

interface MapContainerProps {
  stops: StopWithPhotos[];
  selectedStopId: string | null;
  onStopClick: (stopId: string) => void;
  onMapClick: (lat: number, lng: number) => void;
  poiMarkers?: PlaceResult[];
  showPoiMarkers?: boolean;
}

export function MapContainer({
  stops,
  selectedStopId,
  onStopClick,
  onMapClick,
  poiMarkers,
  showPoiMarkers,
}: MapContainerProps) {
  return (
    <div className="relative w-full h-full">
      <GoogleMapView
        stops={stops}
        selectedStopId={selectedStopId}
        onStopClick={onStopClick}
        onMapClick={onMapClick}
        poiMarkers={poiMarkers}
        showPoiMarkers={showPoiMarkers}
      />
    </div>
  );
}
