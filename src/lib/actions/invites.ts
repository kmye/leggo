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

  const { data: invite, error: fetchError } = await supabase
    .from("trip_invites")
    .select("*")
    .eq("token", token)
    .eq("status", "pending")
    .single();

  if (fetchError || !invite) {
    return { error: "Invite not found or already used" };
  }

  if (new Date(invite.expires_at) < new Date()) {
    return { error: "Invite has expired" };
  }

  const { error: memberError } = await supabase
    .from("trip_members")
    .insert({
      trip_id: invite.trip_id,
      user_id: user.id,
      role: invite.role,
    });

  if (memberError) {
    if (memberError.code === "23505") {
      redirect(`/trip/${invite.trip_id}`);
    }
    return { error: memberError.message };
  }

  await supabase
    .from("trip_invites")
    .update({ status: "accepted", accepted_by: user.id })
    .eq("id", invite.id);

  redirect(`/trip/${invite.trip_id}`);
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
