import { createClient } from "@/lib/supabase/server";
import { MapContainer } from "@/components/map/map-container";
import { Badge } from "@/components/ui/badge";
import type { TripWithDays, StopWithPhotos, StopCategory } from "@/lib/types";

const categoryLabels: Record<StopCategory, string> = {
  food: "Food",
  sightseeing: "Sightseeing",
  hotel: "Hotel",
  transport: "Transport",
  shopping: "Shopping",
  other: "Other",
};

export default async function SharePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  if (!token) {
    return <div className="p-8 text-center">Invalid share link.</div>;
  }

  const supabase = await createClient();
  const { data: trip } = await supabase
    .from("trips")
    .select(`
      *,
      trip_days (
        *,
        stops (
          *,
          stop_photos (*)
        )
      )
    `)
    .eq("id", id)
    .eq("share_token", token)
    .single();

  if (!trip) {
    return <div className="p-8 text-center">Trip not found or link has been revoked.</div>;
  }

  const typedTrip = trip as unknown as TripWithDays;
  const sortedDays = typedTrip.trip_days.sort((a, b) => a.day_number - b.day_number);
  const allStops: StopWithPhotos[] = sortedDays.flatMap((d) =>
    d.stops.sort((a, b) => a.order_index - b.order_index)
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b px-4 py-4">
        <h1 className="text-2xl font-bold">{typedTrip.title}</h1>
        {typedTrip.description && (
          <p className="text-muted-foreground mt-1">{typedTrip.description}</p>
        )}
        <Badge className="mt-2">{typedTrip.status}</Badge>
      </div>

      {/* Map */}
      <div className="h-[400px] border-b">
        <MapContainer
          stops={allStops}
          selectedStopId={null}
          onStopClick={() => {}}
          onMapClick={() => {}}
        />
      </div>

      {/* Itinerary */}
      <div className="container mx-auto py-6 px-4 max-w-3xl">
        {sortedDays.map((day) => (
          <div key={day.id} className="mb-8">
            <h2 className="text-lg font-semibold mb-3">
              Day {day.day_number}
              {day.date && <span className="text-muted-foreground ml-2">({day.date})</span>}
            </h2>
            <div className="space-y-3">
              {day.stops
                .sort((a, b) => a.order_index - b.order_index)
                .map((stop, idx) => (
                  <div key={stop.id} className="flex gap-3 p-3 border rounded-md">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-medium">{stop.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {categoryLabels[stop.category as StopCategory]}
                        </Badge>
                        {stop.time_start && (
                          <span className="text-xs text-muted-foreground">
                            {stop.time_start}{stop.time_end && ` - ${stop.time_end}`}
                          </span>
                        )}
                      </div>
                      {stop.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{stop.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              {day.stops.length === 0 && (
                <p className="text-sm text-muted-foreground">No stops planned.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
