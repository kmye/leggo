"use client";

import { useState } from "react";
import { MapboxMap } from "./mapbox-map";
import { BaiduMap } from "./baidu-map";
import { MapProviderToggle } from "./map-provider-toggle";
import { detectMapProvider } from "@/lib/map/provider";
import type { MapProvider, StopWithPhotos } from "@/lib/types";

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
  const detected = detectMapProvider(stops);
  const [provider, setProvider] = useState<MapProvider>(detected);

  return (
    <div className="relative w-full h-full">
      <MapProviderToggle current={provider} onToggle={setProvider} />
      {provider === "mapbox" ? (
        <MapboxMap
          stops={stops}
          selectedStopId={selectedStopId}
          onStopClick={onStopClick}
          onMapClick={onMapClick}
        />
      ) : (
        <BaiduMap
          stops={stops}
          selectedStopId={selectedStopId}
          onStopClick={onStopClick}
          onMapClick={onMapClick}
        />
      )}
    </div>
  );
}
