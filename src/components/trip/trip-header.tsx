"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShareDialog } from "./share-dialog";
import type { Trip, TripStatus } from "@/lib/types";

interface TripHeaderProps {
  trip: Trip;
  onUpdateStatus: (status: TripStatus) => Promise<{ error: any }>;
  onGenerateShare: () => Promise<{ token: string | undefined; error: any }>;
  onRevokeShare: () => Promise<{ error: any }>;
}

export function TripHeader({
  trip,
  onUpdateStatus,
  onGenerateShare,
  onRevokeShare,
}: TripHeaderProps) {
  const router = useRouter();
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
            Back
          </Button>
          <h1 className="text-lg font-semibold">{trip.title}</h1>
          <Select
            value={trip.status}
            onValueChange={(v) => onUpdateStatus(v as TripStatus)}
          >
            <SelectTrigger className="w-[130px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
          Share
        </Button>
      </div>
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        shareToken={trip.share_token}
        tripId={trip.id}
        onGenerate={onGenerateShare}
        onRevoke={onRevokeShare}
      />
    </>
  );
}
