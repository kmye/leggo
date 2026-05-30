import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY!;
const PLACES_BASE_URL = "https://places.googleapis.com/v1/places";

const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { query, location, radius = 5000, type } = body;

  if (!location?.lat || !location?.lng) {
    return NextResponse.json({ error: "Location required" }, { status: 400 });
  }

  const cacheKey = JSON.stringify({ query, location, radius, type });
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  const requestBody: any = {
    locationBias: {
      circle: {
        center: { latitude: location.lat, longitude: location.lng },
        radius: radius,
      },
    },
    maxResultCount: 20,
  };

  if (query) {
    requestBody.textQuery = query;
  }

  if (type) {
    requestBody.includedTypes = [type];
  }

  const fieldMask = [
    "places.id",
    "places.displayName",
    "places.location",
    "places.formattedAddress",
    "places.rating",
    "places.photos",
    "places.types",
    "places.currentOpeningHours",
  ].join(",");

  const url = query
    ? `${PLACES_BASE_URL}:searchText`
    : `${PLACES_BASE_URL}:searchNearby`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": PLACES_API_KEY,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json({ error: "Places API error", details: err }, { status: 502 });
  }

  const data = await response.json();

  const places = (data.places || []).map((place: any) => ({
    place_id: place.id,
    name: place.displayName?.text || "",
    lat: place.location?.latitude,
    lng: place.location?.longitude,
    address: place.formattedAddress || "",
    rating: place.rating || null,
    photo_url: place.photos?.[0]?.name
      ? `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxHeightPx=200&key=${PLACES_API_KEY}`
      : null,
    types: place.types || [],
    opening_hours: place.currentOpeningHours
      ? { open_now: place.currentOpeningHours.openNow }
      : undefined,
  }));

  const result = { places };
  cache.set(cacheKey, { data: result, expires: Date.now() + CACHE_TTL });

  return NextResponse.json(result);
}
