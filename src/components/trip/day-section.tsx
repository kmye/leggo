"use client";

import { useState } from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Trash2 } from "lucide-react";
import { StopItem } from "./stop-item";
import { Button } from "@/components/ui/button";
import type { DayWithStops } from "@/lib/types";

interface DaySectionProps {
  day: DayWithStops;
  selectedStopId: string | null;
  onStopClick: (stopId: string) => void;
  onAddStop: (dayId: string) => void;
  onRemoveDay: (dayId: string) => void;
}

export function DaySection({
  day,
  selectedStopId,
  onStopClick,
  onAddStop,
  onRemoveDay,
}: DaySectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-2 bg-muted/50 cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            Day {day.day_number}
          </span>
          {day.date && (
            <span className="text-xs text-muted-foreground">
              ({day.date})
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {day.stops.length} stop{day.stops.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveDay(day.id);
            }}
          >
            <Trash2 className="size-4" />
          </Button>
          <span className="text-muted-foreground text-xs">
            {collapsed ? "+" : "-"}
          </span>
        </div>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-2">
          <SortableContext
            items={day.stops.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {day.stops.map((stop, index) => (
              <StopItem
                key={stop.id}
                stop={stop}
                index={index}
                isSelected={stop.id === selectedStopId}
                onClick={() => onStopClick(stop.id)}
              />
            ))}
          </SortableContext>
          {day.stops.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No stops yet
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onAddStop(day.id)}
          >
            + Add Stop
          </Button>
        </div>
      )}
    </div>
  );
}
