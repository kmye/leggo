"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { StopWithPhotos, StopCategory } from "@/lib/types";

const categoryLabels: Record<StopCategory, string> = {
  food: "Food",
  sightseeing: "Sightseeing",
  hotel: "Hotel",
  transport: "Transport",
  shopping: "Shopping",
  other: "Other",
};

const categoryColors: Record<StopCategory, string> = {
  food: "bg-red-100 text-red-700",
  sightseeing: "bg-blue-100 text-blue-700",
  hotel: "bg-purple-100 text-purple-700",
  transport: "bg-gray-100 text-gray-700",
  shopping: "bg-amber-100 text-amber-700",
  other: "bg-green-100 text-green-700",
};

interface StopItemProps {
  stop: StopWithPhotos;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}

export function StopItem({ stop, index, isSelected, onClick }: StopItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: stop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`p-3 rounded-md border cursor-pointer transition-colors ${
        isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="flex-shrink-0 touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{stop.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className={`text-xs ${categoryColors[stop.category]}`}>
              {categoryLabels[stop.category]}
            </Badge>
            {stop.time_start && (
              <span className="text-xs text-muted-foreground">
                {stop.time_start}
                {stop.time_end && ` - ${stop.time_end}`}
              </span>
            )}
          </div>
          {stop.estimated_budget && (
            <p className="text-xs text-muted-foreground mt-1">
              {stop.currency} {stop.estimated_budget}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
