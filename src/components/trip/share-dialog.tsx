"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  shareToken: string | null;
  tripId: string;
  onGenerate: () => Promise<{ token: string | undefined; error: any }>;
  onRevoke: () => Promise<{ error: any }>;
}

export function ShareDialog({
  open,
  onClose,
  shareToken,
  tripId,
  onGenerate,
  onRevoke,
}: ShareDialogProps) {
  const [copying, setCopying] = useState(false);

  const shareUrl = shareToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/${tripId}?token=${shareToken}`
    : null;

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Trip</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {shareUrl ? (
            <>
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly className="flex-1" />
                <Button onClick={handleCopy}>
                  {copying ? "Copied!" : "Copy"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Anyone with this link can view your trip (read-only).
              </p>
              <Button variant="destructive" size="sm" onClick={onRevoke}>
                Revoke Link
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Generate a shareable link so anyone can view this trip without logging in.
              </p>
              <Button onClick={onGenerate}>Generate Share Link</Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
