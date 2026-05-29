import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TripList } from "@/components/dashboard/trip-list";
import { Button } from "@/components/ui/button";
import type { Trip } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: trips } = await supabase
    .from("trips")
    .select("*")
    .order("updated_at", { ascending: false });

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Trips</h1>
        <Link href="/trip/new">
          <Button>New Trip</Button>
        </Link>
      </div>
      <TripList trips={(trips as Trip[]) || []} />
    </div>
  );
}
