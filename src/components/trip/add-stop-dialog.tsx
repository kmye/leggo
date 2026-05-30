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
