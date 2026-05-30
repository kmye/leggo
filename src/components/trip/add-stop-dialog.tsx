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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  }) => void;
  initialCoords?: { lat: number; lng: number } | null;
}

export function AddStopDialog({ open, onClose, onAdd, initialCoords }: AddStopDialogProps) {
  const [name, setName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [category, setCategory] = useState<StopCategory>("sightseeing");
  const [countryCode, setCountryCode] = useState("CN");

  useEffect(() => {
    if (initialCoords) {
      setLatitude(initialCoords.lat.toString());
      setLongitude(initialCoords.lng.toString());
    }
  }, [initialCoords]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      name,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      country_code: countryCode,
      category,
    });
    setName("");
    setLatitude("");
    setLongitude("");
    setCategory("sightseeing");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Stop</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stop-name-input">Name</Label>
            <Input
              id="stop-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tiananmen Square"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Latitude</Label>
              <Input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Longitude</Label>
              <Input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
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
              <Label>Country</Label>
              <Select value={countryCode} onValueChange={(v) => v && setCountryCode(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CN">China</SelectItem>
                  <SelectItem value="JP">Japan</SelectItem>
                  <SelectItem value="KR">Korea</SelectItem>
                  <SelectItem value="TH">Thailand</SelectItem>
                  <SelectItem value="US">USA</SelectItem>
                  <SelectItem value="GB">UK</SelectItem>
                  <SelectItem value="FR">France</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full">Add Stop</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
