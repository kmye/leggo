"use client";

import { useState } from "react";
import { useTrip } from "@/hooks/use-trip";
import { useStops } from "@/hooks/use-stops";
import { TripHeader } from "./trip-header";
import { ItineraryPanel } from "./itinerary-panel";
import { StopDrawer } from "./stop-drawer";
import { AddStopDialog } from "./add-stop-dialog";
import { MapContainer } from "@/components/map/map-container";
import type { StopWithPhotos } from "@/lib/types";

export function TripWorkspace({ tripId }: { tripId: string }) {
  const { trip, loading, refetch, updateStatus, addDay, removeDay, generateShareToken, revokeShareToken } = useTrip(tripId);
  const { addStop, updateStop, deleteStop, reorderStops } = useStops();

  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addStopOpen, setAddStopOpen] = useState(false);
  const [addStopDayId, setAddStopDayId] = useState<string | null>(null);
  const [mapClickCoords, setMapClickCoords] = useState<{ lat: number; lng: number } | null>(null);

  const allStops: StopWithPhotos[] = trip?.trip_days.flatMap((d) => d.stops) || [];

  const selectedStop = allStops.find((s) => s.id === selectedStopId) || null;

  const handleStopClick = (stopId: string) => {
    setSelectedStopId(stopId);
    setDrawerOpen(true);
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (trip && trip.trip_days.length > 0) {
      setMapClickCoords({ lat, lng });
      setAddStopDayId(trip.trip_days[trip.trip_days.length - 1].id);
      setAddStopOpen(true);
    }
  };

  const handleAddStopButton = (dayId: string) => {
    setAddStopDayId(dayId);
    setMapClickCoords(null);
    setAddStopOpen(true);
  };

  const handleAddStop = async (stopData: {
    name: string;
    latitude: number;
    longitude: number;
    country_code: string;
    category: any;
  }) => {
    if (!addStopDayId || !trip) return;
    const day = trip.trip_days.find((d) => d.id === addStopDayId);
    const orderIndex = day ? day.stops.length : 0;

    await addStop(addStopDayId, {
      ...stopData,
      order_index: orderIndex,
      time_start: null,
      time_end: null,
      notes: "",
      estimated_budget: null,
      currency: "CNY",
      links: [],
      booking_references: [],
      custom_fields: [],
    });
    refetch();
  };

  const handleSaveStop = async (stopId: string, updates: Partial<StopWithPhotos>) => {
    await updateStop(stopId, updates);
    refetch();
  };

  const handleDeleteStop = async (stopId: string) => {
    await deleteStop(stopId);
    setSelectedStopId(null);
    refetch();
  };

  const handleReorderStops = async (dayId: string, stopIds: string[]) => {
    await reorderStops(dayId, stopIds);
    refetch();
  };

  const handleAddDay = async () => {
    await addDay();
  };

  const handleRemoveDay = async (dayId: string) => {
    await removeDay(dayId);
  };

  if (loading) return null;
  if (!trip) return <div className="p-8 text-center">Trip not found.</div>;

  return (
    <div className="h-screen flex flex-col">
      <TripHeader
        trip={trip}
        onUpdateStatus={updateStatus}
        onGenerateShare={generateShareToken}
        onRevokeShare={revokeShareToken}
      />
      <div className="flex-1 flex overflow-hidden">
        {/* Itinerary Panel */}
        <div className="w-[380px] border-r overflow-hidden flex-shrink-0 hidden md:block">
          <ItineraryPanel
            days={trip.trip_days}
            selectedStopId={selectedStopId}
            onStopClick={handleStopClick}
            onAddStop={handleAddStopButton}
            onAddDay={handleAddDay}
            onRemoveDay={handleRemoveDay}
            onReorderStops={handleReorderStops}
          />
        </div>

        {/* Map */}
        <div className="flex-1">
          <MapContainer
            stops={allStops}
            selectedStopId={selectedStopId}
            onStopClick={handleStopClick}
            onMapClick={handleMapClick}
          />
        </div>
      </div>

      {/* Mobile: Itinerary below map */}
      <div className="md:hidden border-t max-h-[40vh] overflow-y-auto">
        <ItineraryPanel
          days={trip.trip_days}
          selectedStopId={selectedStopId}
          onStopClick={handleStopClick}
          onAddStop={handleAddStopButton}
          onAddDay={handleAddDay}
          onRemoveDay={handleRemoveDay}
          onReorderStops={handleReorderStops}
        />
      </div>

      <StopDrawer
        stop={selectedStop}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSaveStop}
        onDelete={handleDeleteStop}
        tripId={tripId}
        onPhotosUpdated={refetch}
      />

      <AddStopDialog
        open={addStopOpen}
        onClose={() => setAddStopOpen(false)}
        onAdd={handleAddStop}
        initialCoords={mapClickCoords}
      />
    </div>
  );
}
