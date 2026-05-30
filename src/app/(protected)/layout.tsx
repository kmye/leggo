import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: upsertData, error: upsertError } = await supabase.from("users").upsert(
    {
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    },
    { onConflict: "id" }
  ).select();
  console.log("[protected-layout] user upsert:", { userId: user.id, upsertData, upsertError });

  return <>{children}</>;
}
