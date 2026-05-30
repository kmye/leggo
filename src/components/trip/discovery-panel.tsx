"use client";

import { useState, useCallback } from "react";
import { Search, Compass, Eye, EyeOff, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlaceCard } from "./place-card";
import type { PlaceResult, DayWithStops, StopCategory } from "@/lib/types";

const CATEGORIES = [
  { label: "Food", type: "restaurant" },
  { label: "Sightseeing", type: "tourist_attraction" },
  { label: "Hotel", type: "lodging" },
  { label: "Shopping", type: "shopping_mall" },
] as const;

interface DiscoveryPanelProps {
  days: DayWithStops[];
  searchCenter: { lat: number; lng: number } | null;
  onAddPlace: (place: PlaceResult, dayId: string, category: StopCategory) => void;
  onClose: () => void;
  showOnMap: boolean;
  onToggleShowOnMap: () => void;
  onPlacesLoaded: (places: PlaceResult[]) => void;
}

export function DiscoveryPanel({
  days,
  searchCenter,
  onAddPlace,
  onClose,
  showOnMap,
  onToggleShowOnMap,
  onPlacesLoaded,
}: DiscoveryPanelProps) {
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const search = useCallback(async (searchQuery?: string, type?: string | null) => {
    if (!searchCenter) return;
    setLoading(true);

    const body: any = { location: searchCenter, radius: 5000 };
    if (searchQuery) body.query = searchQuery;
    if (type) body.type = type;

    try {
      const res = await fetch("/api/places/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setPlaces(data.places || []);
      onPlacesLoaded(data.places || []);
    } catch {
      setPlaces([]);
      onPlacesLoaded([]);
    } finally {
      setLoading(false);
    }
  }, [searchCenter, onPlacesLoaded]);

  const handleSearch = () => {
    search(query || undefined, selectedType);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleCategoryClick = (type: string) => {
    const newType = selectedType === type ? null : type;
    setSelectedType(newType);
    search(query || undefined, newType);
  };

  if (!searchCenter) {
    return (
      <div className="h-full flex flex-col p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium flex items-center gap-2">
            <Compass className="size-4" />
            Discover
          </h3>
          <Button variant="ghost" size="icon" className="size-6" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Add a stop to your trip first, or set a destination to start discovering places.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium flex items-center gap-2">
            <Compass className="size-4" />
            Discover
          </h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={onToggleShowOnMap}
              title={showOnMap ? "Hide from map" : "Show on map"}
            >
              {showOnMap ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search places..."
            className="h-8 text-sm"
          />
          <Button size="sm" className="h-8 px-3" onClick={handleSearch} disabled={loading}>
            <Search className="size-3" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <Badge
              key={cat.type}
              variant={selectedType === cat.type ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => handleCategoryClick(cat.type)}
            >
              {cat.label}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && <p className="text-sm text-muted-foreground">Searching...</p>}
        {!loading && places.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Search for places or select a category to get started.
          </p>
        )}
        {places.map((place) => (
          <PlaceCard
            key={place.place_id}
            place={place}
            days={days}
            onAddToDay={onAddPlace}
          />
        ))}
      </div>
    </div>
  );
}
