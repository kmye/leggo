"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
import { Separator } from "@/components/ui/separator";
import { StopPhotos } from "./stop-photos";
import type { StopWithPhotos, StopCategory, StopLink, BookingReference, CustomField } from "@/lib/types";

interface StopDrawerProps {
  stop: StopWithPhotos | null;
  open: boolean;
  onClose: () => void;
  onSave: (stopId: string, updates: Partial<StopWithPhotos>) => void;
  onDelete: (stopId: string) => void;
  tripId: string;
  onPhotosUpdated: () => void;
}

export function StopDrawer({ stop, open, onClose, onSave, onDelete, tripId, onPhotosUpdated }: StopDrawerProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<StopCategory>("other");
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("CNY");
  const [links, setLinks] = useState<StopLink[]>([]);
  const [bookings, setBookings] = useState<BookingReference[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  useEffect(() => {
    if (stop) {
      setName(stop.name);
      setCategory(stop.category);
      setTimeStart(stop.time_start || "");
      setTimeEnd(stop.time_end || "");
      setNotes(stop.notes);
      setBudget(stop.estimated_budget?.toString() || "");
      setCurrency(stop.currency);
      setLinks(stop.links);
      setBookings(stop.booking_references);
      setCustomFields(stop.custom_fields);
    }
  }, [stop]);

  const handleSave = () => {
    if (!stop) return;
    onSave(stop.id, {
      name,
      category,
      time_start: timeStart || null,
      time_end: timeEnd || null,
      notes,
      estimated_budget: budget ? parseFloat(budget) : null,
      currency,
      links,
      booking_references: bookings,
      custom_fields: customFields,
    });
    onClose();
  };

  const addLink = () => setLinks([...links, { label: "", url: "" }]);
  const updateLink = (i: number, field: keyof StopLink, value: string) => {
    const updated = [...links];
    updated[i] = { ...updated[i], [field]: value };
    setLinks(updated);
  };
  const removeLink = (i: number) => setLinks(links.filter((_, idx) => idx !== i));

  const addBooking = () => setBookings([...bookings, { provider: "", ref: "", url: "" }]);
  const updateBooking = (i: number, field: keyof BookingReference, value: string) => {
    const updated = [...bookings];
    updated[i] = { ...updated[i], [field]: value };
    setBookings(updated);
  };
  const removeBooking = (i: number) => setBookings(bookings.filter((_, idx) => idx !== i));

  const addCustomField = () => setCustomFields([...customFields, { key: "", value: "" }]);
  const updateCustomField = (i: number, field: keyof CustomField, value: string) => {
    const updated = [...customFields];
    updated[i] = { ...updated[i], [field]: value };
    setCustomFields(updated);
  };
  const removeCustomField = (i: number) => setCustomFields(customFields.filter((_, idx) => idx !== i));

  if (!stop) return null;

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>Edit Stop</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-4 space-y-4">
          {/* Basic Info */}
          <div className="space-y-2">
            <Label htmlFor="stop-name">Name</Label>
            <Input id="stop-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2" data-vaul-no-drag>
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as StopCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="z-[100]">
                <SelectItem value="food">Food</SelectItem>
                <SelectItem value="sightseeing">Sightseeing</SelectItem>
                <SelectItem value="hotel">Hotel</SelectItem>
                <SelectItem value="transport">Transport</SelectItem>
                <SelectItem value="shopping">Shopping</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input type="time" value={timeStart} onChange={(e) => setTimeStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>

          {/* Budget */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-2">
              <Label>Budget</Label>
              <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </div>
          </div>

          <Separator />

          {/* Photos */}
          <StopPhotos
            photos={stop.stop_photos}
            stopId={stop.id}
            tripId={tripId}
            onUpdate={onPhotosUpdated}
          />

          <Separator />

          {/* Links */}
          <div className="space-y-2">
            <Label>Links</Label>
            {links.map((link, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="Label" value={link.label} onChange={(e) => updateLink(i, "label", e.target.value)} className="flex-1" />
                <Input placeholder="URL" value={link.url} onChange={(e) => updateLink(i, "url", e.target.value)} className="flex-1" />
                <Button variant="ghost" size="sm" onClick={() => removeLink(i)}>x</Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addLink}>+ Add Link</Button>
          </div>

          <Separator />

          {/* Booking References */}
          <div className="space-y-2">
            <Label>Booking References</Label>
            {bookings.map((b, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="Provider" value={b.provider} onChange={(e) => updateBooking(i, "provider", e.target.value)} className="flex-1" />
                <Input placeholder="Ref #" value={b.ref} onChange={(e) => updateBooking(i, "ref", e.target.value)} className="flex-1" />
                <Input placeholder="URL" value={b.url} onChange={(e) => updateBooking(i, "url", e.target.value)} className="flex-1" />
                <Button variant="ghost" size="sm" onClick={() => removeBooking(i)}>x</Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addBooking}>+ Add Booking</Button>
          </div>

          <Separator />

          {/* Custom Fields */}
          <div className="space-y-2">
            <Label>Custom Fields</Label>
            {customFields.map((cf, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="Key" value={cf.key} onChange={(e) => updateCustomField(i, "key", e.target.value)} className="flex-1" />
                <Input placeholder="Value" value={cf.value} onChange={(e) => updateCustomField(i, "value", e.target.value)} className="flex-1" />
                <Button variant="ghost" size="sm" onClick={() => removeCustomField(i)}>x</Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addCustomField}>+ Add Field</Button>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1">Save</Button>
            <Button
              variant="destructive"
              onClick={() => { onDelete(stop.id); onClose(); }}
            >
              Delete
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
