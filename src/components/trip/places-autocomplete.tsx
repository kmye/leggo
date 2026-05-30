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

  const ensureServices = () => {
    if (!autocompleteServiceRef.current && typeof google !== "undefined" && google.maps?.places) {
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
      const div = document.createElement("div");
      placesServiceRef.current = new google.maps.places.PlacesService(div);
    }
  };

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

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const fetchSuggestions = useCallback((input: string) => {
    ensureServices();
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
    ensureServices();
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
