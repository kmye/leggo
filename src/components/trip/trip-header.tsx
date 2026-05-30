"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Compass, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShareDialog } from "./share-dialog";
import { PresenceAvatars } from "./presence-avatars";
import type { Trip, TripStatus, TripWithDays, PresenceMember } from "@/lib/types";

interface TripHeaderProps {
  trip: Trip;
  onUpdateTrip: (updates: Partial<TripWithDays>) => Promise<{ error: any }>;
  onUpdateStatus: (status: TripStatus) => Promise<{ error: any }>;
  onGenerateShare: () => Promise<{ token: string | undefined; error: any }>;
  onRevokeShare: () => Promise<{ error: any }>;
  onlineMembers: PresenceMember[];
  onOpenMembers: () => void;
  onOpenDiscovery: () => void;
}

export function TripHeader({
  trip,
  onUpdateTrip,
  onUpdateStatus,
  onGenerateShare,
  onRevokeShare,
  onlineMembers,
  onOpenMembers,
  onOpenDiscovery,
}: TripHeaderProps) {
  const router = useRouter();
  const [shareOpen, setShareOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [title, setTitle] = useState(trip.title);
  const [description, setDescription] = useState(trip.description);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(trip.title);
    setDescription(trip.description);
  }, [trip.title, trip.description]);

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  useEffect(() => {
    if (editingDescription) descInputRef.current?.focus();
  }, [editingDescription]);

  const saveTitle = () => {
    setEditingTitle(false);
    const trimmed = title.trim();
    if (trimmed && trimmed !== trip.title) {
      onUpdateTrip({ title: trimmed });
    } else {
      setTitle(trip.title);
    }
  };

  const saveDescription = () => {
    setEditingDescription(false);
    if (description !== trip.description) {
      onUpdateTrip({ description });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => router.push("/dashboard")}>
            <ChevronLeft className="size-5" />
          </Button>
          {editingTitle ? (
            <Input
              ref={titleInputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveTitle();
                if (e.key === "Escape") { setTitle(trip.title); setEditingTitle(false); }
              }}
              className="h-8 text-lg font-semibold w-64"
            />
          ) : (
            <h1
              className="text-lg font-semibold cursor-pointer hover:text-primary/80 transition-colors"
              onClick={() => setEditingTitle(true)}
              title="Click to edit"
            >
              {trip.title}
            </h1>
          )}
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
        <div className="flex items-center gap-2">
          <PresenceAvatars members={onlineMembers} />
          <Button variant="ghost" size="icon" className="size-8" onClick={onOpenDiscovery} title="Discover places">
            <Compass className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={onOpenMembers} title="Members">
            <Users className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
            Share
          </Button>
        </div>
      </div>
      {editingDescription ? (
        <div className="px-4 py-1 border-b">
          <Input
            ref={descInputRef}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveDescription}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveDescription();
              if (e.key === "Escape") { setDescription(trip.description); setEditingDescription(false); }
            }}
            placeholder="Add a trip description..."
            className="h-7 text-sm text-muted-foreground border-none shadow-none px-0 focus-visible:ring-0"
          />
        </div>
      ) : (
        <div
          className="px-4 py-1 border-b cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => setEditingDescription(true)}
          title="Click to edit description"
        >
          <p className="text-sm text-muted-foreground">
            {trip.description || "Add a trip description..."}
          </p>
        </div>
      )}
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
