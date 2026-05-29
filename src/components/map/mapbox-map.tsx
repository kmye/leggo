"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { StopWithPhotos, StopCategory } from "@/lib/types";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const categoryColors: Record<StopCategory, string> = {
  food: "#ef4444",
  sightseeing: "#3b82f6",
  hotel: "#8b5cf6",
  transport: "#6b7280",
  shopping: "#f59e0b",
  other: "#10b981",
};

interface MapboxMapProps {
  stops: StopWithPhotos[];
  selectedStopId: string | null;
  onStopClick: (stopId: string) => void;
  onMapClick: (lat: number, lng: number) => void;
}

export function MapboxMap({
  stops,
  selectedStopId,
  onStopClick,
  onMapClick,
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: stops.length > 0 ? [stops[0].longitude, stops[0].latitude] : [104.0, 35.0],
      zoom: stops.length > 0 ? 12 : 4,
    });

    map.current.addControl(new mapboxgl.NavigationControl());

    map.current.on("click", (e) => {
      onMapClick(e.lngLat.lat, e.lngLat.lng);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;

    markers.current.forEach((m) => m.remove());
    markers.current = [];

    stops.forEach((stop, index) => {
      const el = document.createElement("div");
      el.className = "w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold cursor-pointer";
      el.style.backgroundColor = categoryColors[stop.category];
      el.textContent = String(index + 1);

      if (stop.id === selectedStopId) {
        el.style.transform = "scale(1.3)";
        el.style.borderColor = "#000";
      }

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onStopClick(stop.id);
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([stop.longitude, stop.latitude])
        .addTo(map.current!);

      markers.current.push(marker);
    });

    // Draw lines between stops
    const sourceId = "route-line";
    if (map.current.getSource(sourceId)) {
      (map.current.getSource(sourceId) as mapboxgl.GeoJSONSource).setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: stops.map((s) => [s.longitude, s.latitude]),
        },
      });
    } else if (stops.length >= 2) {
      map.current.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: stops.map((s) => [s.longitude, s.latitude]),
          },
        },
      });
      map.current.addLayer({
        id: "route-line-layer",
        type: "line",
        source: sourceId,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#6366f1", "line-width": 2, "line-dasharray": [2, 2] },
      });
    }

    // Fit bounds if stops exist
    if (stops.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      stops.forEach((s) => bounds.extend([s.longitude, s.latitude]));
      map.current.fitBounds(bounds, { padding: 60, maxZoom: 15 });
    }
  }, [stops, selectedStopId, onStopClick]);

  return <div ref={mapContainer} className="w-full h-full" />;
}
