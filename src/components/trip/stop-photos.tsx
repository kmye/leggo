"use client";

import { useRef } from "react";
import { usePhotos } from "@/hooks/use-photos";
import { Button } from "@/components/ui/button";
import type { StopPhoto } from "@/lib/types";

interface StopPhotosProps {
  photos: StopPhoto[];
  stopId: string;
  tripId: string;
  onUpdate: () => void;
}

const MAX_PHOTOS = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function StopPhotos({ photos, stopId, tripId, onUpdate }: StopPhotosProps) {
  const { uploadPhoto, deletePhoto, getPhotoUrl } = usePhotos();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remaining = MAX_PHOTOS - photos.length;
    const toUpload = Array.from(files).slice(0, remaining);

    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i];
      if (file.size > MAX_FILE_SIZE) continue;
      await uploadPhoto(stopId, tripId, file, photos.length + i);
    }

    onUpdate();
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDelete = async (photo: StopPhoto) => {
    await deletePhoto(photo.id, photo.storage_path);
    onUpdate();
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <div key={photo.id} className="relative group aspect-square">
            <img
              src={getPhotoUrl(photo.storage_path)}
              alt={photo.caption || "Stop photo"}
              className="w-full h-full object-cover rounded-md"
            />
            <button
              onClick={() => handleDelete(photo)}
              className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              x
            </button>
          </div>
        ))}
      </div>
      {photos.length < MAX_PHOTOS && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            + Upload Photos ({photos.length}/{MAX_PHOTOS})
          </Button>
        </>
      )}
    </div>
  );
}
