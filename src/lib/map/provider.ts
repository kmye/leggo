import type { MapProvider, StopWithPhotos } from "@/lib/types";

const CHINA_COUNTRY_CODE = "CN";

export function detectMapProvider(stops: StopWithPhotos[]): MapProvider {
  if (stops.length === 0) return "baidu";

  const chinaStops = stops.filter((s) => s.country_code === CHINA_COUNTRY_CODE);
  const ratio = chinaStops.length / stops.length;

  return ratio >= 0.5 ? "baidu" : "mapbox";
}

export function getProviderForCountry(countryCode: string): MapProvider {
  return countryCode === CHINA_COUNTRY_CODE ? "baidu" : "mapbox";
}
