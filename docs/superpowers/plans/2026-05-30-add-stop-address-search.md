# Add Stop Address Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace lat/lng input in the Add Stop dialog with Google Places Autocomplete address search, auto-filling stop name and country from place data.

**Architecture:** A new `PlacesAutocomplete` component wraps the Google Places Autocomplete Service. The `AddStopDialog` is rewritten to use this component as the primary input, with lat/lng resolved behind the scenes. Map-click triggers reverse geocoding to fill the same fields.

**Tech Stack:** `@react-google-maps/api` (already installed), Google Places API, Google Geocoding API, React 19, shadcn/ui

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/trip/places-autocomplete.tsx` | Create | Standalone Places Autocomplete input with suggestions dropdown |
| `src/components/trip/add-stop-dialog.tsx` | Rewrite | New form: search → name → category → notes |
| `src/components/map/google-map.tsx` | Modify | Add `places` library to loader, export `isLoaded` state |
| `src/components/trip/trip-workspace.tsx` | Modify | Update `handleMapClick` to reverse-geocode, update `handleAddStop` to pass `notes` |
| `src/hooks/use-stops.ts` | No change | Already handles `notes` field |
| `src/lib/types.ts` | No change | `Stop` already has `notes: string` |

---

### Task 1: Add `places` library to Google Maps loader

**Files:**
- Modify: `src/components/map/google-map.tsx:36-39`

- [ ] **Step 1: Update `useJsApiLoader` to include the `places` library**

```tsx
const LIBRARIES: ("places")[] = ["places"];

// Inside the component:
const { isLoaded } = useJsApiLoader({
  id: "google-map-script",
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  libraries: LIBRARIES,
});
```

The `LIBRARIES` array is declared outside the component to avoid re-renders (the library treats a new array reference as a prop change).

- [ ] **Step 2: Verify the app still loads**

Run: `pnpm dev`

Open `http://localhost:3000` and navigate to a trip page. Map should still render with markers. Check browser console for errors — there should be none.

- [ ] **Step 3: Commit**

```bash
git add src/components/map/google-map.tsx
git commit -m "feat: load Google Places library in maps loader"
```

---

### Task 2: Create `PlacesAutocomplete` component

**Files:**
- Create: `src/components/trip/places-autocomplete.tsx`

- [ ] **Step 1: Create the component file**

```tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";

interface PlaceResult {
  name: string;
  latitude: number;
  longitude: number;
  countryCode: string;
  formattedAddress: string;
}

interface PlacesAutocompleteProps {
  onPlaceSelect: (place: PlaceResult) => void;
  initialValue?: string;
}

export function PlacesAutocomplete({ onPlaceSelect, initialValue = "" }: PlacesAutocompleteProps) {
  const [inputValue, setInputValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof google !== "undefined" && google.maps?.places) {
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
      const div = document.createElement("div");
      placesServiceRef.current = new google.maps.places.PlacesService(div);
    }
  }, []);

  useEffect(() => {
    setInputValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback((input: string) => {
    if (!autocompleteServiceRef.current || input.length < 2) {
      setSuggestions([]);
      return;
    }
    autocompleteServiceRef.current.getPlacePredictions(
      { input },
      (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
        }
      }
    );
  }, []);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  const handleSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesServiceRef.current) return;

    placesServiceRef.current.getDetails(
      { placeId: prediction.place_id, fields: ["name", "geometry", "address_components", "formatted_address"] },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const countryComponent = place.address_components?.find(
            (c) => c.types.includes("country")
          );
          onPlaceSelect({
            name: place.name || prediction.structured_formatting.main_text,
            latitude: place.geometry.location.lat(),
            longitude: place.geometry.location.lng(),
            countryCode: countryComponent?.short_name || "",
            formattedAddress: place.formatted_address || prediction.description,
          });
          setInputValue(prediction.description);
          setShowSuggestions(false);
          setSuggestions([]);
        }
      }
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        placeholder="e.g. Eiffel Tower, 123 Main St..."
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-60 overflow-y-auto">
          {suggestions.map((s) => (
            <li
              key={s.place_id}
              className="px-3 py-2 cursor-pointer hover:bg-accent text-sm"
              onMouseDown={() => handleSelect(s)}
            >
              <div className="font-medium">{s.structured_formatting.main_text}</div>
              <div className="text-muted-foreground text-xs">{s.structured_formatting.secondary_text}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`

Expected: No errors related to `places-autocomplete.tsx`. The `google.maps.places` types should be available from `@react-google-maps/api`.

- [ ] **Step 3: Commit**

```bash
git add src/components/trip/places-autocomplete.tsx
git commit -m "feat: add PlacesAutocomplete component"
```

---

### Task 3: Rewrite `AddStopDialog` with new form

**Files:**
- Modify: `src/components/trip/add-stop-dialog.tsx`

- [ ] **Step 1: Update the `AddStopDialogProps` interface and rewrite the component**

Replace the entire file content with:

```tsx
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlacesAutocomplete } from "./places-autocomplete";
import type { StopCategory } from "@/lib/types";

interface AddStopDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (stop: {
    name: string;
    latitude: number;
    longitude: number;
    country_code: string;
    category: StopCategory;
    notes: string;
  }) => void;
  initialPlace?: {
    name: string;
    latitude: number;
    longitude: number;
    countryCode: string;
    formattedAddress: string;
  } | null;
}

export function AddStopDialog({ open, onClose, onAdd, initialPlace }: AddStopDialogProps) {
  const [name, setName] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [countryCode, setCountryCode] = useState("");
  const [category, setCategory] = useState<StopCategory>("sightseeing");
  const [notes, setNotes] = useState("");
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    if (initialPlace) {
      setName(initialPlace.name);
      setLatitude(initialPlace.latitude);
      setLongitude(initialPlace.longitude);
      setCountryCode(initialPlace.countryCode);
      setSearchValue(initialPlace.formattedAddress);
    }
  }, [initialPlace]);

  const handlePlaceSelect = (place: {
    name: string;
    latitude: number;
    longitude: number;
    countryCode: string;
    formattedAddress: string;
  }) => {
    setName(place.name);
    setLatitude(place.latitude);
    setLongitude(place.longitude);
    setCountryCode(place.countryCode);
    setSearchValue(place.formattedAddress);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (latitude === null || longitude === null) return;
    onAdd({
      name,
      latitude,
      longitude,
      country_code: countryCode,
      category,
      notes,
    });
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setName("");
    setLatitude(null);
    setLongitude(null);
    setCountryCode("");
    setCategory("sightseeing");
    setNotes("");
    setSearchValue("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Stop</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Search place or address</Label>
            <PlacesAutocomplete
              onPlaceSelect={handlePlaceSelect}
              initialValue={searchValue}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stop-name-input">Stop name</Label>
            <Input
              id="stop-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Auto-filled from place"
              required
            />
            <p className="text-xs text-muted-foreground">
              Auto-filled from place — edit if you want a custom name
            </p>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as StopCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="food">Food</SelectItem>
                <SelectItem value="sightseeing">Sightseeing</SelectItem>
                <SelectItem value="hotel">Hotel</SelectItem>
                <SelectItem value="transport">Transport</SelectItem>
                <SelectItem value="shopping">Shopping</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stop-notes-input">
              Notes <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="stop-notes-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Opens at 8am, bring ID, skip the south entrance..."
              rows={3}
            />
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Or click anywhere on the map to set location
          </p>

          <Button type="submit" className="w-full" disabled={latitude === null}>
            Add Stop
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Ensure the `Textarea` component exists from shadcn/ui**

Run: `pnpm dlx shadcn@latest add textarea`

If it already exists this is a no-op.

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`

Expected: May show errors in `trip-workspace.tsx` since the prop interface changed (`initialCoords` → `initialPlace`). That's expected — Task 4 fixes it.

- [ ] **Step 4: Commit**

```bash
git add src/components/trip/add-stop-dialog.tsx
git commit -m "feat: rewrite AddStopDialog with Places search and notes field"
```

---

### Task 4: Update `TripWorkspace` to reverse-geocode map clicks

**Files:**
- Modify: `src/components/trip/trip-workspace.tsx`

- [ ] **Step 1: Replace `mapClickCoords` state with `mapClickPlace` and add reverse geocoding**

Replace the full file content with:

```tsx
"use client";

import { useState, useRef } from "react";
import { useTrip } from "@/hooks/use-trip";
import { useStops } from "@/hooks/use-stops";
import { TripHeader } from "./trip-header";
import { ItineraryPanel } from "./itinerary-panel";
import { StopDrawer } from "./stop-drawer";
import { AddStopDialog } from "./add-stop-dialog";
import { MapContainer } from "@/components/map/map-container";
import type { StopWithPhotos } from "@/lib/types";

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
    category: any;
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
        onClose={() => setAddStopOpen(false)}
        onAdd={handleAddStop}
        initialPlace={mapClickPlace}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/trip/trip-workspace.tsx
git commit -m "feat: reverse-geocode map clicks and pass place data to AddStopDialog"
```

---

### Task 5: Manual testing and final verification

**Files:** None (testing only)

- [ ] **Step 1: Start dev server**

Run: `pnpm dev`

- [ ] **Step 2: Test address search flow**

1. Navigate to a trip page
2. Click "+ Add Stop" on any day
3. Type "Eiffel Tower" in the search field
4. Verify autocomplete suggestions appear
5. Select a suggestion
6. Verify: stop name auto-fills, submit button becomes enabled
7. Change the name to something custom (e.g., "Paris photo spot")
8. Select a category, optionally add a note
9. Click "Add Stop"
10. Verify: stop appears on map at correct location, appears in itinerary

- [ ] **Step 3: Test map-click flow**

1. Click directly on the map
2. Verify: Add Stop dialog opens with address/name pre-filled from reverse geocoding
3. Submit the stop
4. Verify: marker appears at the exact clicked position

- [ ] **Step 4: Test edge cases**

1. Open dialog, type a search, then clear it — verify you can still type a new search
2. Open dialog via "+ Add Stop" button (no map click) — verify search field is empty, submit button is disabled until a place is selected
3. Click map in an empty area (ocean) — verify dialog still opens with coordinate-based fallback name

- [ ] **Step 5: Run lint and type check**

Run: `pnpm lint && npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 6: Commit any fixes**

If any issues were found and fixed in previous steps:

```bash
git add -A
git commit -m "fix: address edge cases in add-stop address search"
```
