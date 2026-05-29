"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TripCard } from "./trip-card";
import type { Trip, TripStatus } from "@/lib/types";

export function TripList({ trips }: { trips: Trip[] }) {
  const filterByStatus = (status: TripStatus) =>
    trips.filter((t) => t.status === status);

  return (
    <Tabs defaultValue="all">
      <TabsList>
        <TabsTrigger value="all">All ({trips.length})</TabsTrigger>
        <TabsTrigger value="planning">
          Planning ({filterByStatus("planning").length})
        </TabsTrigger>
        <TabsTrigger value="active">
          Active ({filterByStatus("active").length})
        </TabsTrigger>
        <TabsTrigger value="completed">
          Completed ({filterByStatus("completed").length})
        </TabsTrigger>
      </TabsList>
      <TabsContent value="all" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
        {trips.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
        {trips.length === 0 && (
          <p className="text-muted-foreground col-span-full text-center py-8">
            No trips yet. Create your first one!
          </p>
        )}
      </TabsContent>
      {(["planning", "active", "completed"] as TripStatus[]).map((status) => (
        <TabsContent key={status} value={status} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
          {filterByStatus(status).map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
          {filterByStatus(status).length === 0 && (
            <p className="text-muted-foreground col-span-full text-center py-8">
              No {status} trips.
            </p>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
