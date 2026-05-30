import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-lg">
        <h1 className="text-4xl font-bold tracking-tight">Leggo</h1>
        <p className="text-xl text-muted-foreground">
          Plan your trips day by day. Pin stops on the map. Share with friends.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/login">
            <Button size="lg">Get Started</Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Supports Baidu Maps for China and Mapbox for international destinations.
        </p>
      </div>
    </div>
  );
}
