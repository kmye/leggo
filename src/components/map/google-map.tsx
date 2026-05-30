"use client";

import { useCallback, useRef, useEffect } from "react";
import { GoogleMap, useJsApiLoader, Marker, Polyline } from "@react-google-maps/api";
import type { StopWithPhotos, StopCategory } from "@/lib/types";

const categoryColors: Record<StopCategory, string> = {
  food: "#ef4444",
  sightseeing: "#3b82f6",
  hotel: "#8b5cf6",
  transport: "#6b7280",
  shopping: "#f59e0b",
  other: "#10b981",
};

const containerStyle = {
  width: "100%",
  height: "100%",
};

const defaultCenter = { lat: 35.0, lng: 104.0 };

const LIBRARIES: ("places")[] = ["places"];

interface GoogleMapViewProps {
  stops: StopWithPhotos[];
  selectedStopId: string | null;
  onStopClick: (stopId: string) => void;
  onMapClick: (lat: number, lng: number) => void;
}

export function GoogleMapView({
  stops,
  selectedStopId,
  onStopClick,
  onMapClick,
}: GoogleMapViewProps) {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: LIBRARIES,
  });

  const mapRef = useRef<google.maps.Map | null>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  useEffect(() => {
    if (!mapRef.current || stops.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    stops.forEach((stop) => {
      bounds.extend({ lat: stop.latitude, lng: stop.longitude });
    });
    mapRef.current.fitBounds(bounds, 60);
  }, [stops]);

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      onMapClick(e.latLng.lat(), e.latLng.lng());
    }
  };

  if (!isLoaded) {
    return <div className="w-full h-full flex items-center justify-center bg-muted">Loading map...</div>;
  }

  const center = stops.length > 0
    ? { lat: stops[0].latitude, lng: stops[0].longitude }
    : defaultCenter;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={stops.length > 0 ? 12 : 4}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onClick={handleMapClick}
    >
      {stops.map((stop, index) => (
        <Marker
          key={stop.id}
          position={{ lat: stop.latitude, lng: stop.longitude }}
          label={{
            text: String(index + 1),
            color: "#ffffff",
            fontSize: "12px",
            fontWeight: "bold",
          }}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: stop.id === selectedStopId ? 14 : 12,
            fillColor: categoryColors[stop.category],
            fillOpacity: 1,
            strokeColor: stop.id === selectedStopId ? "#000000" : "#ffffff",
            strokeWeight: 2,
          }}
          onClick={() => onStopClick(stop.id)}
        />
      ))}

      {stops.length >= 2 && (
        <Polyline
          path={stops.map((s) => ({ lat: s.latitude, lng: s.longitude }))}
          options={{
            strokeColor: "#6366f1",
            strokeOpacity: 0.8,
            strokeWeight: 2,
            geodesic: true,
          }}
        />
      )}
    </GoogleMap>
  );
}
