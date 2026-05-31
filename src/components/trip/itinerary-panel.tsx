"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { DaySection } from "./day-section";
import { StopItem } from "./stop-item";
import { Button } from "@/components/ui/button";
import type { DayWithStops, StopWithPhotos } from "@/lib/types";

interface ItineraryPanelProps {
  days: DayWithStops[];
  selectedStopId: string | null;
  onStopClick: (stopId: string) => void;
  onAddStop: (dayId: string) => void;
  onAddDay: () => void;
  onRemoveDay: (dayId: string) => void;
  onReorderStops: (dayId: string, stopIds: string[]) => void;
  onMoveStopToDay: (stopId: string, sourceDayId: string, destDayId: string, newIndex: number) => void;
}

function findDayContainingStop(days: DayWithStops[], stopId: string): DayWithStops | undefined {
  return days.find((day) => day.stops.some((s) => s.id === stopId));
}

export function ItineraryPanel({
  days,
  selectedStopId,
  onStopClick,
  onAddStop,
  onAddDay,
  onRemoveDay,
  onReorderStops,
  onMoveStopToDay,
}: ItineraryPanelProps) {
  const [activeStop, setActiveStop] = useState<StopWithPhotos | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const stop = days
      .flatMap((d) => d.stops)
      .find((s) => s.id === event.active.id);
    setActiveStop(stop || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveStop(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const sourceDay = findDayContainingStop(days, activeId);
    if (!sourceDay) return;

    let destDay = findDayContainingStop(days, overId);
    let overIndex: number;

    if (destDay) {
      overIndex = destDay.stops.findIndex((s) => s.id === overId);
    } else {
      destDay = days.find((d) => d.id === overId);
      if (!destDay) return;
      overIndex = destDay.stops.length;
    }

    if (sourceDay.id === destDay.id) {
      const stopIds = sourceDay.stops.map((s) => s.id);
      const oldIndex = stopIds.indexOf(activeId);
      const newIndex = stopIds.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1) return;

      const newOrder = [...stopIds];
      newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, activeId);
      onReorderStops(sourceDay.id, newOrder);
    } else {
      onMoveStopToDay(activeId, sourceDay.id, destDay.id, overIndex);
    }
  };

  const handleDragCancel = () => {
    setActiveStop(null);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
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
          <DragOverlay>
            {activeStop ? (
              <StopItem
                stop={activeStop}
                index={0}
                isSelected={false}
                onClick={() => {}}
              />
            ) : null}
          </DragOverlay>
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
