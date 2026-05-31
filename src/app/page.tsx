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
        <h1 className="text-4xl font-bold tracking-tight">Leggo Together</h1>
        <p className="text-xl text-muted-foreground">
          Plan your trips day by day. Pin stops on the map. Share with friends.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/login">
            <Button size="lg">Get Started</Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Powered by Google Maps.
        </p>
        <a href="https://www.buymeacoffee.com/kmye" target="_blank" rel="noopener noreferrer">
          <img
            src="https://cdn.buymeacoffee.com/buttons/v2/default-blue.png"
            alt="Buy Me a Coffee"
            style={{ height: "60px", width: "217px" }}
          />
        </a>
      </div>
    </div>
  );
}
