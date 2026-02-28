"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Building2,
  MapPin,
  Star,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { hotelService } from "@/services/hotel.service";
import type { CreateHotelDto } from "@/types/hotel.types";

const STEPS = [
  { id: 1, label: "Basic Info", icon: Building2 },
  { id: 2, label: "Location", icon: MapPin },
  { id: 3, label: "Rating & Amenities", icon: Star },
  { id: 4, label: "Review", icon: CheckCircle },
];

const AMENITIES = [
  "WiFi", "Pool", "Spa", "Gym", "Restaurant", "Bar", "Parking",
  "Room Service", "Laundry", "Concierge", "Airport Shuttle", "Pet Friendly",
  "Business Center", "Meeting Rooms", "EV Charging",
];

const COUNTRIES = ["Vietnam", "Thailand", "Singapore", "Malaysia", "Indonesia", "Philippines"];

type FormData = CreateHotelDto;

const INITIAL_FORM: FormData = {
  name: "",
  description: "",
  address: "",
  city: "",
  country: "Vietnam",
  starRating: 3,
  amenities: [],
};

export default function NewPropertyPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const mutation = useMutation({
    mutationFn: (dto: CreateHotelDto) => hotelService.createHotel(dto),
    onSuccess: (data) => {
      router.push(`/owner/properties/${data.data?.id ?? ""}`);
    },
  });

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleAmenity = (amenity: string) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const validateStep = (s: number): boolean => {
    const newErrors: typeof errors = {};
    if (s === 1) {
      if (!form.name.trim()) newErrors.name = "Hotel name is required";
      if (!form.description.trim()) newErrors.description = "Description is required";
    }
    if (s === 2) {
      if (!form.address.trim()) newErrors.address = "Address is required";
      if (!form.city.trim()) newErrors.city = "City is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const next = () => {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, 4));
  };

  const back = () => setStep((s) => Math.max(s - 1, 1));

  const submit = () => {
    if (!mutation.isPending) mutation.mutate(form);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add New Property</h1>
        <p className="text-muted-foreground mt-1">
          Fill in the details to register your hotel
        </p>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isCompleted = step > s.id;
          const isCurrent = step === s.id;
          return (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  isCompleted
                    ? "bg-primary text-primary-foreground"
                    : isCurrent
                      ? "bg-primary/20 text-primary border-2 border-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span
                className={`text-sm hidden sm:block ${
                  isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    step > s.id ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <Card>
        <CardContent className="p-6 space-y-5">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Hotel Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. Grand Palace Hotel"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your hotel, what makes it special..."
                  rows={4}
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  aria-invalid={!!errors.description}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {form.description.length}/500 characters
                </p>
              </div>
            </>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="address">Street Address *</Label>
                <Input
                  id="address"
                  placeholder="e.g. 123 Nguyen Hue Street"
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  aria-invalid={!!errors.address}
                />
                {errors.address && (
                  <p className="text-sm text-destructive">{errors.address}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    placeholder="e.g. Ho Chi Minh City"
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    aria-invalid={!!errors.city}
                  />
                  {errors.city && (
                    <p className="text-sm text-destructive">{errors.city}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select
                    value={form.country}
                    onValueChange={(v) => update("country", v)}
                  >
                    <SelectTrigger id="country">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* Step 3: Rating & Amenities */}
          {step === 3 && (
            <>
              <div className="space-y-3">
                <Label>Star Rating</Label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((stars) => (
                    <button
                      key={stars}
                      onClick={() => update("starRating", stars)}
                      className="cursor-pointer"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          stars <= form.starRating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-muted-foreground">
                    {form.starRating}-star hotel
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Amenities</Label>
                <div className="flex flex-wrap gap-2">
                  {AMENITIES.map((amenity) => {
                    const selected = form.amenities.includes(amenity);
                    return (
                      <button
                        key={amenity}
                        onClick={() => toggleAmenity(amenity)}
                        className="cursor-pointer"
                      >
                        <Badge
                          variant={selected ? "default" : "outline"}
                          className="transition-colors"
                        >
                          {amenity}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {form.amenities.length} selected
                </p>
              </div>
            </>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Review your property details</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Hotel Name</p>
                  <p className="font-medium">{form.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Star Rating</p>
                  <p className="font-medium">{form.starRating} Stars</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-muted-foreground">Description</p>
                  <p className="font-medium">{form.description}</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-muted-foreground">Address</p>
                  <p className="font-medium">
                    {form.address}, {form.city}, {form.country}
                  </p>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-muted-foreground">Amenities</p>
                  <div className="flex flex-wrap gap-1.5">
                    {form.amenities.length > 0 ? (
                      form.amenities.map((a) => (
                        <Badge key={a} variant="secondary">
                          {a}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">None selected</span>
                    )}
                  </div>
                </div>
              </div>

              {mutation.isError && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                  Failed to create hotel. Please try again.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={back}
          disabled={step === 1}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>

        {step < 4 ? (
          <Button onClick={next}>
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? "Creating..." : "Create Property"}
          </Button>
        )}
      </div>
    </div>
  );
}
