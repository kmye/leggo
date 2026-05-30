"use client";

import { useState, useEffect } from "react";
import { Users, Copy, X, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createInvite, getInvites, revokeInvite, getMembers, removeMember } from "@/lib/actions/invites";
import type { TripInvite, TripMemberWithUser, MemberRole } from "@/lib/types";

interface MembersPanelProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  isOwner: boolean;
}

export function MembersPanel({ open, onClose, tripId, isOwner }: MembersPanelProps) {
  const [members, setMembers] = useState<TripMemberWithUser[]>([]);
  const [invites, setInvites] = useState<TripInvite[]>([]);
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    const [membersData, invitesData] = await Promise.all([
      getMembers(tripId),
      getInvites(tripId),
    ]);
    setMembers(membersData as TripMemberWithUser[]);
    setInvites(invitesData as TripInvite[]);
    setGeneratedLink(null);
  };

  const handleCreateInvite = async () => {
    const invite = await createInvite(tripId, inviteRole);
    setGeneratedLink(`${origin}/invite/${invite.token}`);
    setInvites((prev) => [invite as TripInvite, ...prev]);
  };

  const handleRevoke = async (inviteId: string) => {
    await revokeInvite(inviteId);
    setInvites((prev) =>
      prev.map((i) => (i.id === inviteId ? { ...i, status: "revoked" as const } : i))
    );
  };

  const handleRemoveMember = async (userId: string) => {
    await removeMember(tripId, userId);
    setMembers((prev) => prev.filter((m) => m.user_id !== userId));
  };

  const handleCopy = async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pendingInvites = invites.filter((i) => i.status === "pending");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-5" />
            Members
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current members */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Members</h3>
            {members.length === 0 && (
              <p className="text-sm text-muted-foreground">No collaborators yet.</p>
            )}
            {members.map((member) => (
              <div key={member.user_id} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  {member.users.avatar_url && (
                    <img
                      src={member.users.avatar_url}
                      alt=""
                      className="size-6 rounded-full"
                    />
                  )}
                  <span className="text-sm">{member.users.name || member.users.email}</span>
                  <Badge variant="secondary" className="text-xs">{member.role}</Badge>
                </div>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={() => handleRemoveMember(member.user_id)}
                  >
                    <X className="size-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Create invite (owner only) */}
          {isOwner && (
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-medium">Invite Link</h3>
              <div className="flex gap-2">
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "editor" | "viewer")}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleCreateInvite} className="flex-1">
                  Generate Link
                </Button>
              </div>

              {generatedLink && (
                <div className="flex gap-2 items-center">
                  <code className="flex-1 text-xs bg-muted p-2 rounded truncate">
                    {generatedLink}
                  </code>
                  <Button variant="outline" size="icon" className="size-8 shrink-0" onClick={handleCopy}>
                    {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                  </Button>
                </div>
              )}

              {/* Pending invites */}
              {pendingInvites.length > 0 && (
                <div className="space-y-1 pt-2">
                  <h4 className="text-xs text-muted-foreground">Active Invites</h4>
                  {pendingInvites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{invite.role}</Badge>
                        <span className="text-xs text-muted-foreground">
                          expires {new Date(invite.expires_at).toLocaleDateString()}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-destructive"
                        onClick={() => handleRevoke(invite.id)}
                      >
                        Revoke
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
