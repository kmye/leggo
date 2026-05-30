import { createClient } from "@/lib/supabase/server";
import { TripWorkspace } from "@/components/trip/trip-workspace";
import { redirect } from "next/navigation";

export default async function TripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: trip } = await supabase
    .from("trips")
    .select("owner_id")
    .eq("id", id)
    .single();

  const isOwner = trip?.owner_id === user.id;

  const currentUser = {
    id: user.id,
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || "",
    avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
  };

  return <TripWorkspace tripId={id} currentUser={currentUser} isOwner={isOwner} />;
}
