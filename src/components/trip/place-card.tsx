"use client";

import { Star, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import type { PlaceResult, DayWithStops, StopCategory } from "@/lib/types";

const typeToCategory: Record<string, StopCategory> = {
  restaurant: "food",
  cafe: "food",
  bakery: "food",
  bar: "food",
  tourist_attraction: "sightseeing",
  museum: "sightseeing",
  park: "sightseeing",
  lodging: "hotel",
  transit_station: "transport",
  shopping_mall: "shopping",
  store: "shopping",
};

interface PlaceCardProps {
  place: PlaceResult;
  days: DayWithStops[];
  onAddToDay: (place: PlaceResult, dayId: string, category: StopCategory) => void;
}

export function PlaceCard({ place, days, onAddToDay }: PlaceCardProps) {
  const [adding, setAdding] = useState(false);

  const inferredCategory: StopCategory =
    place.types.reduce<StopCategory | null>((found, t) => {
      if (found) return found;
      return typeToCategory[t] || null;
    }, null) || "other";

  const handleAdd = (dayId: string) => {
    onAddToDay(place, dayId, inferredCategory);
    setAdding(false);
  };

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex gap-3">
        {place.photo_url && (
          <img
            src={place.photo_url}
            alt=""
            className="size-14 rounded object-cover shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium truncate">{place.name}</h4>
          <p className="text-xs text-muted-foreground truncate">{place.address}</p>
          {place.rating && (
            <div className="flex items-center gap-1 mt-0.5">
              <Star className="size-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs">{place.rating}</span>
            </div>
          )}
        </div>
      </div>

      {adding ? (
        <Select onValueChange={(v: string | null) => { if (v) handleAdd(v); }}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Select day..." />
          </SelectTrigger>
          <SelectContent>
            {days.map((day) => (
              <SelectItem key={day.id} value={day.id}>
                Day {day.day_number}{day.date ? ` (${day.date})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full h-7 text-xs"
          onClick={() => setAdding(true)}
        >
          <Plus className="size-3 mr-1" />
          Add to Day
        </Button>
      )}
    </div>
  );
}
