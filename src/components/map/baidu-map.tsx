"use client";

import { useEffect, useRef } from "react";
import type { StopWithPhotos, StopCategory } from "@/lib/types";

declare global {
  interface Window {
    BMapGL: any;
    initBaiduMap: () => void;
  }
}

const categoryColors: Record<StopCategory, string> = {
  food: "#ef4444",
  sightseeing: "#3b82f6",
  hotel: "#8b5cf6",
  transport: "#6b7280",
  shopping: "#f59e0b",
  other: "#10b981",
};

interface BaiduMapProps {
  stops: StopWithPhotos[];
  selectedStopId: string | null;
  onStopClick: (stopId: string) => void;
  onMapClick: (lat: number, lng: number) => void;
}

function loadBaiduScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.BMapGL) {
      resolve();
      return;
    }
    window.initBaiduMap = () => resolve();
    const script = document.createElement("script");
    script.src = `https://api.map.baidu.com/api?v=1.0&type=webgl&ak=${process.env.NEXT_PUBLIC_BAIDU_MAP_AK}&callback=initBaiduMap`;
    document.head.appendChild(script);
  });
}

export function BaiduMap({
  stops,
  selectedStopId,
  onStopClick,
  onMapClick,
}: BaiduMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    let mounted = true;

    loadBaiduScript().then(() => {
      if (!mounted || !mapContainer.current || map.current) return;

      const BMapGL = window.BMapGL;
      const center = stops.length > 0
        ? new BMapGL.Point(stops[0].longitude, stops[0].latitude)
        : new BMapGL.Point(116.404, 39.915);

      map.current = new BMapGL.Map(mapContainer.current);
      map.current.centerAndZoom(center, stops.length > 0 ? 13 : 5);
      map.current.enableScrollWheelZoom(true);
      map.current.addControl(new BMapGL.NavigationControl());

      map.current.addEventListener("click", (e: any) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    });

    return () => {
      mounted = false;
      if (map.current) {
        map.current.destroy();
        map.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!map.current || !window.BMapGL) return;

    const BMapGL = window.BMapGL;

    markersRef.current.forEach((m) => map.current.removeOverlay(m));
    markersRef.current = [];

    stops.forEach((stop, index) => {
      const point = new BMapGL.Point(stop.longitude, stop.latitude);
      const marker = new BMapGL.Marker(point);

      const label = new BMapGL.Label(String(index + 1), {
        position: point,
        offset: new BMapGL.Size(-4, -10),
      });
      label.setStyle({
        color: "#fff",
        fontSize: "12px",
        backgroundColor: categoryColors[stop.category],
        border: "none",
        padding: "2px 6px",
        borderRadius: "50%",
      });

      marker.addEventListener("click", () => onStopClick(stop.id));
      map.current.addOverlay(marker);
      map.current.addOverlay(label);
      markersRef.current.push(marker, label);
    });

    // Draw lines
    if (stops.length >= 2) {
      const points = stops.map((s) => new BMapGL.Point(s.longitude, s.latitude));
      const polyline = new BMapGL.Polyline(points, {
        strokeColor: "#6366f1",
        strokeWeight: 2,
        strokeStyle: "dashed",
      });
      map.current.addOverlay(polyline);
      markersRef.current.push(polyline);
    }

    // Fit viewport
    if (stops.length > 0) {
      const points = stops.map((s) => new BMapGL.Point(s.longitude, s.latitude));
      const viewport = map.current.getViewport(points);
      map.current.centerAndZoom(viewport.center, viewport.zoom);
    }
  }, [stops, selectedStopId, onStopClick]);

  return <div ref={mapContainer} className="w-full h-full" />;
}
