import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";

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

  const navUser = {
    name: user.user_metadata?.full_name || user.user_metadata?.name || null,
    email: user.email!,
    avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
  };

  return (
    <>
      <Navbar user={navUser} />
      <main className="flex-1">{children}</main>
    </>
  );
}
