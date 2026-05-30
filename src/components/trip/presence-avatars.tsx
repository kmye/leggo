"use client";

import type { PresenceMember } from "@/lib/types";

interface PresenceAvatarsProps {
  members: PresenceMember[];
}

export function PresenceAvatars({ members }: PresenceAvatarsProps) {
  if (members.length === 0) return null;

  const visible = members.slice(0, 3);
  const overflow = members.length - 3;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((member) => (
        <div
          key={member.user_id}
          className="relative size-7 rounded-full border-2 border-background"
          title={member.name}
        >
          {member.avatar_url ? (
            <img
              src={member.avatar_url}
              alt={member.name}
              className="size-full rounded-full object-cover"
            />
          ) : (
            <div className="size-full rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
              {member.name?.charAt(0) || "?"}
            </div>
          )}
          <span className="absolute bottom-0 right-0 size-2 rounded-full bg-green-500 border border-background" />
        </div>
      ))}
      {overflow > 0 && (
        <div className="size-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium">
          +{overflow}
        </div>
      )}
    </div>
  );
}
