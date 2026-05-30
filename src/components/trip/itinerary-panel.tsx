"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { DaySection } from "./day-section";
import { Button } from "@/components/ui/button";
import type { DayWithStops } from "@/lib/types";

interface ItineraryPanelProps {
  days: DayWithStops[];
  selectedStopId: string | null;
  onStopClick: (stopId: string) => void;
  onAddStop: (dayId: string) => void;
  onAddDay: () => void;
  onRemoveDay: (dayId: string) => void;
  onReorderStops: (dayId: string, stopIds: string[]) => void;
}

export function ItineraryPanel({
  days,
  selectedStopId,
  onStopClick,
  onAddStop,
  onAddDay,
  onRemoveDay,
  onReorderStops,
}: ItineraryPanelProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    for (const day of days) {
      const stopIds = day.stops.map((s) => s.id);
      const oldIndex = stopIds.indexOf(active.id as string);
      const newIndex = stopIds.indexOf(over.id as string);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = [...stopIds];
        newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, active.id as string);
        onReorderStops(day.id, newOrder);
        break;
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          {days.map((day) => (
            <DaySection
              key={day.id}
              day={day}
              selectedStopId={selectedStopId}
              onStopClick={onStopClick}
              onAddStop={onAddStop}
              onRemoveDay={onRemoveDay}
            />
          ))}
        </DndContext>
      </div>
      <div className="p-4 border-t">
        <Button variant="outline" className="w-full" onClick={onAddDay}>
          + Add Day
        </Button>
      </div>
    </div>
  );
}
