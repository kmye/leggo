"use client";

import { createClient } from "@/lib/supabase/client";
import type { Stop, StopWithPhotos } from "@/lib/types";

export function useStops() {
  const supabase = createClient();

  const addStop = async (
    dayId: string,
    stop: Omit<Stop, "id" | "day_id" | "created_at">
  ) => {
    const { data, error } = await supabase
      .from("stops")
      .insert({ ...stop, day_id: dayId })
      .select("*, stop_photos(*)")
      .single();

    return { data: data as StopWithPhotos | null, error };
  };

  const updateStop = async (stopId: string, updates: Partial<Stop>) => {
    const { data, error } = await supabase
      .from("stops")
      .update(updates)
      .eq("id", stopId)
      .select("*, stop_photos(*)")
      .single();

    return { data: data as StopWithPhotos | null, error };
  };

  const deleteStop = async (stopId: string) => {
    const { error } = await supabase.from("stops").delete().eq("id", stopId);
    return { error };
  };

  const reorderStops = async (
    dayId: string,
    stopIds: string[]
  ) => {
    const updates = stopIds.map((id, index) => ({
      id,
      day_id: dayId,
      order_index: index,
    }));

    const promises = updates.map(({ id, order_index }) =>
      supabase.from("stops").update({ order_index }).eq("id", id)
    );

    const results = await Promise.all(promises);
    const error = results.find((r) => r.error)?.error;
    return { error };
  };

  const moveStopToDay = async (
    stopId: string,
    newDayId: string,
    newOrderIndex: number
  ) => {
    const { error } = await supabase
      .from("stops")
      .update({ day_id: newDayId, order_index: newOrderIndex })
      .eq("id", stopId);

    return { error };
  };

  return { addStop, updateStop, deleteStop, reorderStops, moveStopToDay };
}
