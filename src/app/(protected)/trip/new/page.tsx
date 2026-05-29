"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function NewTripPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: trip, error } = await supabase
      .from("trips")
      .insert({
        owner_id: user.id,
        title,
        description,
        status: "planning",
      })
      .select()
      .single();

    if (error) {
      setLoading(false);
      return;
    }

    // Create first day automatically
    await supabase.from("trip_days").insert({
      trip_id: trip.id,
      day_number: 1,
      notes: "",
    });

    router.push(`/trip/${trip.id}`);
  };

  return (
    <div className="container mx-auto max-w-lg py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Create New Trip</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Trip Title</Label>
          <Input
            id="title"
            name="title"
            placeholder="e.g. Beijing Weekend Getaway"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            name="description"
            placeholder="What's this trip about?"
            rows={3}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating..." : "Create Trip"}
        </Button>
      </form>
    </div>
  );
}
