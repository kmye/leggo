# Add Stop: Address Search Redesign

## Summary

Replace the manual latitude/longitude input in the Add Stop dialog with a Google Places Autocomplete search field. Users search by place name or address, and coordinates + country are resolved automatically. Map-click remains as an alternative entry method.

## Current Behavior

- Add Stop dialog has fields: Name, Latitude, Longitude, Category, Country
- Coordinates are entered via map click (auto-fills lat/lng fields) or manual number input
- Country is selected manually from a dropdown

## New Behavior

### Form Fields (in order)

1. **Search place or address** — Google Places Autocomplete input with live suggestions dropdown
2. **Stop name** — text input, auto-filled from the selected place's name, editable by user
3. **Category** — dropdown (Food, Sightseeing, Hotel, Transport, Shopping, Other) — unchanged
4. **Notes** — optional textarea for tips, reminders, opening hours, etc.

### Removed Fields

- **Latitude** — resolved behind the scenes from place data, never shown
- **Longitude** — resolved behind the scenes from place data, never shown
- **Country dropdown** — auto-derived from place's address components

### Entry Methods

1. **Address search (primary):** User types in the search field → selects from autocomplete suggestions → lat/lng and country are resolved from the place, name is auto-filled
2. **Map click (secondary):** User clicks on the map → reverse geocoding resolves the clicked coordinates to an address/place name → auto-fills search field, name, and country

### Data Flow

```
User types in search field
  → Google Places Autocomplete shows suggestions
  → User selects a suggestion
  → Place details fetched (geometry.location, address_components, name)
  → Auto-fill:
      - Stop name ← place.name
      - latitude ← place.geometry.location.lat
      - longitude ← place.geometry.location.lng
      - country_code ← address_components[type=country].short_name
```

```
User clicks on map
  → Capture lat/lng from click event
  → Reverse geocode (lat/lng → address)
  → Auto-fill:
      - Search field ← formatted_address
      - Stop name ← first result's name or short address
      - country_code ← address_components[type=country].short_name
      - latitude/longitude ← click coordinates
```

### Google Maps API Requirements

- **Places Autocomplete** — for search suggestions (already have API key via `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`)
- **Place Details** — to get geometry and address components from a selected suggestion
- **Geocoding (reverse)** — to resolve map-click coordinates to an address

The `@react-google-maps/api` library already loaded in the project supports these APIs. The `useJsApiLoader` call needs to include the `places` library.

### Database Impact

No schema changes required. The `stops` table already has:
- `latitude decimal not null`
- `longitude decimal not null`
- `country_code text`
- `notes text default ''`

All fields are populated from the new UI — just through a different input mechanism.

### Edge Cases

- **No internet/API failure:** Show error toast, let user retry search. Map click still works as fallback.
- **Place with no country component:** Default to null/empty country_code (same as current behavior for "Other" country).
- **User clears the search field after selecting a place:** Keep the resolved lat/lng and name unless a new place is selected.
- **Map click on water/empty area:** Reverse geocoding may return sparse results — use whatever is available for name, coordinates are always valid from the click event.

### UX Details

- Autocomplete dropdown appears after 2+ characters typed
- Debounce search input (300ms) to avoid excessive API calls
- Selected place shows as filled search field text (not a chip/tag)
- "Or click anywhere on the map to set location" hint text at bottom of dialog
- Notes field placeholder: "e.g. Opens at 8am, bring ID, skip the south entrance..."
