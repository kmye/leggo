import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ placeId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { placeId } = await params;

  const fieldMask = [
    "id",
    "displayName",
    "location",
    "formattedAddress",
    "rating",
    "photos",
    "types",
    "currentOpeningHours",
    "websiteUri",
    "nationalPhoneNumber",
  ].join(",");

  const response = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}`,
    {
      headers: {
        "X-Goog-Api-Key": PLACES_API_KEY,
        "X-Goog-FieldMask": fieldMask,
      },
    }
  );

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json({ error: "Places API error", details: err }, { status: 502 });
  }

  const place = await response.json();

  const result = {
    place_id: place.id,
    name: place.displayName?.text || "",
    lat: place.location?.latitude,
    lng: place.location?.longitude,
    address: place.formattedAddress || "",
    rating: place.rating || null,
    photo_url: place.photos?.[0]?.name
      ? `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxHeightPx=400&key=${PLACES_API_KEY}`
      : null,
    types: place.types || [],
    opening_hours: place.currentOpeningHours
      ? { open_now: place.currentOpeningHours.openNow }
      : undefined,
    website: place.websiteUri || null,
    phone: place.nationalPhoneNumber || null,
  };

  return NextResponse.json(result);
}
