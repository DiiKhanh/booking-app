"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Room, RoomType, CreateRoomDto } from "@/types/hotel.types";

const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: "standard", label: "Standard" },
  { value: "deluxe", label: "Deluxe" },
  { value: "suite", label: "Suite" },
  { value: "penthouse", label: "Penthouse" },
];

const BED_TYPES = [
  "Single", "Twin", "Double", "Queen", "King", "Super King", "Bunk Beds",
];

const ROOM_AMENITIES = [
  "Air Conditioning", "TV", "WiFi", "Mini Bar", "Safe", "Bathtub",
  "Rain Shower", "Balcony", "Ocean View", "City View", "Kitchenette",
  "Work Desk", "Sofa", "Coffee Maker",
];

interface FormState {
  name: string;
  type: RoomType;
  description: string;
  capacity: string;
  bedType: string;
  size: string;
  basePrice: string;
  amenities: string[];
}

interface RoomFormProps {
  room?: Room;
  onSubmit: (data: CreateRoomDto) => void;
  isLoading?: boolean;
}

export function RoomForm({ room, onSubmit, isLoading }: RoomFormProps) {
  const [form, setForm] = useState<FormState>({
    name: room?.name ?? "",
    type: room?.type ?? "standard",
    description: room?.description ?? "",
    capacity: String(room?.capacity ?? 2),
    bedType: room?.bedType ?? "Double",
    size: String(room?.size ?? 25),
    basePrice: String(room?.basePrice ?? 100),
    amenities: room?.amenities ?? [],
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleAmenity = (a: string) =>
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(a)
        ? prev.amenities.filter((x) => x !== a)
        : [...prev.amenities, a],
    }));

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = "Room name is required";
    if (form.description.trim().length < 10) next.description = "Min 10 characters";
    if (!form.bedType) next.bedType = "Bed type is required";
    const cap = Number(form.capacity);
    if (!form.capacity || cap < 1 || cap > 10) next.capacity = "1–10 guests";
    const sz = Number(form.size);
    if (!form.size || sz < 10) next.size = "Min 10 m²";
    const price = Number(form.basePrice);
    if (!form.basePrice || price <= 0) next.basePrice = "Must be > 0";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      name: form.name,
      type: form.type,
      description: form.description,
      capacity: Number(form.capacity),
      bedType: form.bedType,
      size: Number(form.size),
      basePrice: Number(form.basePrice),
      amenities: form.amenities,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-2">
          <Label htmlFor="name">Room Name *</Label>
          <Input
            id="name"
            placeholder="e.g. Deluxe Ocean View"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            aria-invalid={!!errors.name}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Room Type *</Label>
          <Select
            value={form.type}
            onValueChange={(v) => update("type", v as RoomType)}
          >
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROOM_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bedType">Bed Type *</Label>
          <Select
            value={form.bedType}
            onValueChange={(v) => update("bedType", v)}
          >
            <SelectTrigger id="bedType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BED_TYPES.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.bedType && (
            <p className="text-sm text-destructive">{errors.bedType}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          placeholder="Describe this room..."
          rows={3}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          aria-invalid={!!errors.description}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description}</p>
        )}
      </div>

      {/* Capacity, Size, Price */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="capacity">Max Guests</Label>
          <Input
            id="capacity"
            type="number"
            min={1}
            max={10}
            value={form.capacity}
            onChange={(e) => update("capacity", e.target.value)}
            aria-invalid={!!errors.capacity}
          />
          {errors.capacity && (
            <p className="text-sm text-destructive">{errors.capacity}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="size">Size (m²)</Label>
          <Input
            id="size"
            type="number"
            min={10}
            value={form.size}
            onChange={(e) => update("size", e.target.value)}
            aria-invalid={!!errors.size}
          />
          {errors.size && (
            <p className="text-sm text-destructive">{errors.size}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="basePrice">Price ($/night)</Label>
          <Input
            id="basePrice"
            type="number"
            min={1}
            step={0.01}
            value={form.basePrice}
            onChange={(e) => update("basePrice", e.target.value)}
            aria-invalid={!!errors.basePrice}
          />
          {errors.basePrice && (
            <p className="text-sm text-destructive">{errors.basePrice}</p>
          )}
        </div>
      </div>

      {/* Amenities */}
      <div className="space-y-3">
        <Label>Room Amenities</Label>
        <div className="flex flex-wrap gap-2">
          {ROOM_AMENITIES.map((a) => {
            const selected = form.amenities.includes(a);
            return (
              <button
                key={a}
                type="button"
                onClick={() => toggleAmenity(a)}
                className="cursor-pointer"
              >
                <Badge
                  variant={selected ? "default" : "outline"}
                  className="transition-colors"
                >
                  {a}
                </Badge>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {form.amenities.length} amenities selected
        </p>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Saving..." : room ? "Update Room" : "Create Room"}
      </Button>
    </form>
  );
}
