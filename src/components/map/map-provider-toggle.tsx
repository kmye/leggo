"use client";

import { Button } from "@/components/ui/button";
import type { MapProvider } from "@/lib/types";

interface MapProviderToggleProps {
  current: MapProvider;
  onToggle: (provider: MapProvider) => void;
}

export function MapProviderToggle({ current, onToggle }: MapProviderToggleProps) {
  return (
    <div className="absolute top-2 right-2 z-10">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onToggle(current === "baidu" ? "mapbox" : "baidu")}
      >
        {current === "baidu" ? "Switch to Mapbox" : "Switch to Baidu"}
      </Button>
    </div>
  );
}
