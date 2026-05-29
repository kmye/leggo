"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TripWithDays, TripDay, TripStatus } from "@/lib/types";

export function useTrip(tripId: string) {
  const [trip, setTrip] = useState<TripWithDays | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchTrip = useCallback(async () => {
    const { data } = await supabase
      .from("trips")
      .select(`
        *,
        trip_days (
          *,
          stops (
            *,
            stop_photos (*)
          )
        )
      `)
      .eq("id", tripId)
      .single();

    if (data) {
      const sorted = {
        ...data,
        trip_days: data.trip_days
          .sort((a: TripDay, b: TripDay) => a.day_number - b.day_number)
          .map((day: TripDay & { stops: any[] }) => ({
            ...day,
            stops: day.stops.sort((a: any, b: any) => a.order_index - b.order_index),
          })),
      };
      setTrip(sorted as TripWithDays);
    }
    setLoading(false);
  }, [tripId, supabase]);

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  const updateTrip = async (updates: Partial<TripWithDays>) => {
    const { error } = await supabase
      .from("trips")
      .update(updates)
      .eq("id", tripId);

    if (!error) {
      setTrip((prev) => (prev ? { ...prev, ...updates } : null));
    }
    return { error };
  };

  const updateStatus = async (status: TripStatus) => {
    return updateTrip({ status });
  };

  const addDay = async () => {
    const nextNumber = trip ? trip.trip_days.length + 1 : 1;
    const { data, error } = await supabase
      .from("trip_days")
      .insert({ trip_id: tripId, day_number: nextNumber, notes: "" })
      .select()
      .single();

    if (!error && data) {
      setTrip((prev) =>
        prev
          ? { ...prev, trip_days: [...prev.trip_days, { ...data, stops: [] }] }
          : null
      );
    }
    return { data, error };
  };

  const removeDay = async (dayId: string) => {
    const { error } = await supabase
      .from("trip_days")
      .delete()
      .eq("id", dayId);

    if (!error) {
      setTrip((prev) =>
        prev
          ? {
              ...prev,
              trip_days: prev.trip_days
                .filter((d) => d.id !== dayId)
                .map((d, i) => ({ ...d, day_number: i + 1 })),
            }
          : null
      );
    }
    return { error };
  };

  const generateShareToken = async () => {
    const token = crypto.randomUUID();
    const { error } = await supabase
      .from("trips")
      .update({ share_token: token })
      .eq("id", tripId);

    if (!error) {
      setTrip((prev) => (prev ? { ...prev, share_token: token } : null));
    }
    return { token, error };
  };

  const revokeShareToken = async () => {
    const { error } = await supabase
      .from("trips")
      .update({ share_token: null })
      .eq("id", tripId);

    if (!error) {
      setTrip((prev) => (prev ? { ...prev, share_token: null } : null));
    }
    return { error };
  };

  return {
    trip,
    loading,
    refetch: fetchTrip,
    updateTrip,
    updateStatus,
    addDay,
    removeDay,
    generateShareToken,
    revokeShareToken,
  };
}
