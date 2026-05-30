"use client";

import { createClient } from "@/lib/supabase/client";
import type { StopPhoto } from "@/lib/types";

export function usePhotos() {
  const supabase = createClient();

  const uploadPhoto = async (
    stopId: string,
    tripId: string,
    file: File,
    orderIndex: number
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error("Not authenticated") };

    const ext = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const storagePath = `${user.id}/${tripId}/${stopId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("stop-photos")
      .upload(storagePath, file, { contentType: file.type });

    if (uploadError) return { data: null, error: uploadError };

    const { data, error } = await supabase
      .from("stop_photos")
      .insert({
        stop_id: stopId,
        storage_path: storagePath,
        order_index: orderIndex,
      })
      .select()
      .single();

    return { data: data as StopPhoto | null, error };
  };

  const deletePhoto = async (photoId: string, storagePath: string) => {
    await supabase.storage.from("stop-photos").remove([storagePath]);
    const { error } = await supabase.from("stop_photos").delete().eq("id", photoId);
    return { error };
  };

  const getPhotoUrl = (storagePath: string) => {
    const { data } = supabase.storage.from("stop-photos").getPublicUrl(storagePath);
    return data.publicUrl;
  };

  return { uploadPhoto, deletePhoto, getPhotoUrl };
}
