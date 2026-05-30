"use client";

import { useState, useRef } from "react";
import { useTrip } from "@/hooks/use-trip";
import { useStops } from "@/hooks/use-stops";
import { TripHeader } from "./trip-header";
import { ItineraryPanel } from "./itinerary-panel";
import { StopDrawer } from "./stop-drawer";
import { AddStopDialog } from "./add-stop-dialog";
import { MapContainer } from "@/components/map/map-container";
import type { StopWithPhotos, StopCategory } from "@/lib/types";

interface PlaceData {
  name: string;
  latitude: number;
  longitude: number;
  countryCode: string;
  formattedAddress: string;
}

export function TripWorkspace({ tripId }: { tripId: string }) {
  const { trip, loading, refetch, updateStatus, addDay, removeDay, generateShareToken, revokeShareToken } = useTrip(tripId);
  const { addStop, updateStop, deleteStop, reorderStops } = useStops();

  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addStopOpen, setAddStopOpen] = useState(false);
  const [addStopDayId, setAddStopDayId] = useState<string | null>(null);
  const [mapClickPlace, setMapClickPlace] = useState<PlaceData | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const allStops: StopWithPhotos[] = trip?.trip_days.flatMap((d) => d.stops) || [];

  const selectedStop = allStops.find((s) => s.id === selectedStopId) || null;

  const handleStopClick = (stopId: string) => {
    setSelectedStopId(stopId);
    setDrawerOpen(true);
  };

  const handleMapClick = async (lat: number, lng: number) => {
    if (!trip || trip.trip_days.length === 0) return;

    if (!geocoderRef.current && typeof google !== "undefined") {
      geocoderRef.current = new google.maps.Geocoder();
    }

    let placeData: PlaceData = {
      name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      latitude: lat,
      longitude: lng,
      countryCode: "",
      formattedAddress: "",
    };

    if (geocoderRef.current) {
      try {
        const response = await geocoderRef.current.geocode({ location: { lat, lng } });
        if (response.results && response.results.length > 0) {
          const result = response.results[0];
          const countryComponent = result.address_components.find(
            (c) => c.types.includes("country")
          );
          const nameComponent = result.address_components.find(
            (c) => c.types.includes("point_of_interest") || c.types.includes("premise")
          );
          placeData = {
            name: nameComponent?.long_name || result.address_components[0]?.long_name || placeData.name,
            latitude: lat,
            longitude: lng,
            countryCode: countryComponent?.short_name || "",
            formattedAddress: result.formatted_address,
          };
        }
      } catch {
        // Use fallback placeData with raw coords
      }
    }

    setMapClickPlace(placeData);
    setAddStopDayId(trip.trip_days[trip.trip_days.length - 1].id);
    setAddStopOpen(true);
  };

  const handleAddStopButton = (dayId: string) => {
    setAddStopDayId(dayId);
    setMapClickPlace(null);
    setAddStopOpen(true);
  };

  const handleAddStop = async (stopData: {
    name: string;
    latitude: number;
    longitude: number;
    country_code: string;
    category: StopCategory;
    notes: string;
  }) => {
    if (!addStopDayId || !trip) return;
    const day = trip.trip_days.find((d) => d.id === addStopDayId);
    const orderIndex = day ? day.stops.length : 0;

    await addStop(addStopDayId, {
      ...stopData,
      order_index: orderIndex,
      time_start: null,
      time_end: null,
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

        <div className="flex-1">
          <MapContainer
            stops={allStops}
            selectedStopId={selectedStopId}
            onStopClick={handleStopClick}
            onMapClick={handleMapClick}
          />
        </div>
      </div>

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
        onClose={() => { setAddStopOpen(false); setMapClickPlace(null); }}
        onAdd={handleAddStop}
        initialPlace={mapClickPlace}
      />
    </div>
  );
}
