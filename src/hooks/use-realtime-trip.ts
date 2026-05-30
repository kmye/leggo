"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTrip } from "./use-trip";
import type { PresenceMember } from "@/lib/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

export function useRealtimeTrip(tripId: string, currentUser: { id: string; name: string; avatar_url: string | null }) {
  const tripHook = useTrip(tripId);
  const [onlineMembers, setOnlineMembers] = useState<PresenceMember[]>([]);
  const [currentStopId, setCurrentStopId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const channel: RealtimeChannel = supabase.channel(`trip:${tripId}`, {
      config: { presence: { key: currentUser.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceMember>();
        const members: PresenceMember[] = [];
        for (const [, presences] of Object.entries(state)) {
          for (const p of presences) {
            if (p.user_id !== currentUser.id) {
              members.push({
                user_id: p.user_id,
                name: p.name,
                avatar_url: p.avatar_url,
                current_stop_id: p.current_stop_id,
              });
            }
          }
        }
        setOnlineMembers(members);
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stops" },
        () => { tripHook.refetch(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trip_days" },
        () => { tripHook.refetch(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stop_photos" },
        () => { tripHook.refetch(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trip_members" },
        () => { tripHook.refetch(); }
      )
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: currentUser.id,
            name: currentUser.name,
            avatar_url: currentUser.avatar_url,
            current_stop_id: currentStopId,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, currentUser.id]);

  const updatePresenceStop = useCallback(async (stopId: string | null) => {
    setCurrentStopId(stopId);
    const channel = supabase.channel(`trip:${tripId}`);
    await channel.track({
      user_id: currentUser.id,
      name: currentUser.name,
      avatar_url: currentUser.avatar_url,
      current_stop_id: stopId,
    });
  }, [tripId, currentUser]);

  return {
    ...tripHook,
    onlineMembers,
    updatePresenceStop,
  };
}
