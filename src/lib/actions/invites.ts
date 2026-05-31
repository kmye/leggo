"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createInvite(tripId: string, role: "editor" | "viewer") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("trip_invites")
    .insert({
      trip_id: tripId,
      inviter_id: user.id,
      role,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getInvites(tripId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("trip_invites")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function revokeInvite(inviteId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("trip_invites")
    .update({ status: "revoked" })
    .eq("id", inviteId);

  if (error) throw new Error(error.message);
}

export async function acceptInvite(token: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/invite/" + token);

  const { data: tripId, error } = await supabase.rpc("accept_trip_invite", {
    p_token: token,
  });

  if (error) {
    if (error.message.includes("already")) {
      const { data: invite } = await supabase
        .from("trip_invites")
        .select("trip_id")
        .eq("token", token)
        .single();
      if (invite) redirect(`/trip/${invite.trip_id}`);
    }
    return { error: error.message };
  }

  redirect(`/trip/${tripId}`);
}

export async function getMembers(tripId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("trip_members")
    .select("*, users(id, name, avatar_url, email)")
    .eq("trip_id", tripId);

  if (error) throw new Error(error.message);
  return data;
}

export async function removeMember(tripId: string, userId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("trip_members")
    .delete()
    .eq("trip_id", tripId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}
