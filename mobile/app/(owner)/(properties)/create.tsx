import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";

import { LocationPicker } from "@/components/map/LocationPicker";
import { ownerService } from "@/services/owner.service";

const AMENITY_OPTIONS = [
  "WiFi",
  "Pool",
  "Gym",
  "Spa",
  "Parking",
  "Restaurant",
  "Bar",
  "Beach Access",
] as const;

interface FormState {
  name: string;
  description: string;
  address: string;
  city: string;
  country: string;
  starRating: number;
  amenities: string[];
  latitude: number;
  longitude: number;
}

const INITIAL_FORM: FormState = {
  name: "",
  description: "",
  address: "",
  city: "",
  country: "Vietnam",
  starRating: 0,
  amenities: [],
  latitude: 0,
  longitude: 0,
};

function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      className="text-base mb-4"
      style={{ fontFamily: "PlusJakartaSans-SemiBold", color: "#1A3A6B" }}
    >
      {title}
    </Text>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <Text
      className="text-xs mb-1.5 uppercase tracking-wide"
      style={{ fontFamily: "Inter-Medium", color: "#64748B" }}
    >
      {label}
    </Text>
  );
}

function StyledInput({
  value,
  onChangeText,
  placeholder,
  multiline,
  numberOfLines,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
  numberOfLines?: number;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#CBD5E1"
      multiline={multiline}
      numberOfLines={numberOfLines}
      textAlignVertical={multiline ? "top" : "center"}
      className="bg-neutral-50 rounded-xl px-4 border border-neutral-200"
      style={{
        fontFamily: "Inter-Regular",
        fontSize: 14,
        color: "#1E293B",
        paddingVertical: multiline ? 12 : 0,
        height: multiline ? (numberOfLines ?? 4) * 24 : 48,
      }}
    />
  );
}

export default function CreatePropertyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleAmenity = (amenity: string) => {
    setForm((prev) => {
      const has = prev.amenities.includes(amenity);
      return {
        ...prev,
        amenities: has
          ? prev.amenities.filter((a) => a !== amenity)
          : [...prev.amenities, amenity],
      };
    });
  };

  const validate = (): string | null => {
    if (!form.name.trim()) return "Hotel name is required.";
    if (!form.address.trim()) return "Address is required.";
    if (!form.city.trim()) return "City is required.";
    if (!form.country.trim()) return "Country is required.";
    if (form.starRating < 1 || form.starRating > 5) return "Please select a star rating (1–5).";
    if (form.latitude === 0 && form.longitude === 0)
      return "Please tap the map or drag the pin to place your hotel location.";
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await ownerService.createHotel({
        name: form.name.trim(),
        description: form.description.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        latitude: form.latitude,
        longitude: form.longitude,
        starRating: form.starRating,
        amenities: form.amenities,
      });
      await queryClient.invalidateQueries({ queryKey: ["owner-hotels"] });
      router.replace("/(owner)/(properties)");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create hotel. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View
        className="flex-row items-center px-4 pb-3 border-b border-neutral-100"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center"
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text
          className="ml-3 text-lg"
          style={{ fontFamily: "PlusJakartaSans-SemiBold", color: "#1E293B" }}
        >
          Add Hotel
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Section 1 — Basic Info */}
        <SectionHeader title="Basic Information" />

        <FieldLabel label="Hotel Name" />
        <StyledInput
          value={form.name}
          onChangeText={(v) => updateField("name", v)}
          placeholder="e.g. Grand Palace Hotel"
        />

        <View className="mt-4">
          <FieldLabel label="Description" />
          <StyledInput
            value={form.description}
            onChangeText={(v) => updateField("description", v)}
            placeholder="Describe your hotel..."
            multiline
            numberOfLines={4}
          />
        </View>

        <View className="mt-4">
          <FieldLabel label="Address" />
          <StyledInput
            value={form.address}
            onChangeText={(v) => updateField("address", v)}
            placeholder="Street address"
          />
        </View>

        <View className="flex-row gap-3 mt-4">
          <View className="flex-1">
            <FieldLabel label="City" />
            <StyledInput
              value={form.city}
              onChangeText={(v) => updateField("city", v)}
              placeholder="e.g. Ho Chi Minh City"
            />
          </View>
          <View className="flex-1">
            <FieldLabel label="Country" />
            <StyledInput
              value={form.country}
              onChangeText={(v) => updateField("country", v)}
              placeholder="e.g. Vietnam"
            />
          </View>
        </View>

        {/* Section 2 — Classification */}
        <View className="mt-8">
          <SectionHeader title="Classification" />

          <FieldLabel label="Star Rating" />
          <View className="flex-row gap-2 mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => updateField("starRating", star)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Ionicons
                  name={form.starRating >= star ? "star" : "star-outline"}
                  size={32}
                  color={form.starRating >= star ? "#F59E0B" : "#CBD5E1"}
                />
              </TouchableOpacity>
            ))}
          </View>

          <View className="mt-5">
            <FieldLabel label="Amenities" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
            >
              {AMENITY_OPTIONS.map((amenity) => {
                const active = form.amenities.includes(amenity);
                return (
                  <TouchableOpacity
                    key={amenity}
                    onPress={() => toggleAmenity(amenity)}
                    className="rounded-full px-4 py-2 border"
                    style={{
                      backgroundColor: active ? "#1A3A6B" : "#F8FAFC",
                      borderColor: active ? "#1A3A6B" : "#E2E8F0",
                    }}
                  >
                    <Text
                      className="text-sm"
                      style={{
                        fontFamily: "Inter-Medium",
                        color: active ? "#FFFFFF" : "#475569",
                      }}
                    >
                      {amenity}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* Section 3 — Location */}
        <View className="mt-8">
          <SectionHeader title="Hotel Location" />
          <Text
            className="text-xs mb-4 -mt-2"
            style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}
          >
            Drag the pin or tap the map to place your hotel
          </Text>
          <LocationPicker
            coordinate={{ latitude: form.latitude, longitude: form.longitude }}
            onCoordinateChange={(coord) => {
              setForm((prev) => ({
                ...prev,
                latitude: coord.latitude,
                longitude: coord.longitude,
              }));
            }}
          />
        </View>

        {/* Inline error */}
        {error && (
          <View
            className="mt-6 rounded-xl px-4 py-3 flex-row items-center gap-2"
            style={{ backgroundColor: "#FEE2E2" }}
          >
            <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
            <Text
              className="flex-1 text-sm"
              style={{ fontFamily: "Inter-Regular", color: "#DC2626" }}
            >
              {error}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Sticky submit */}
      <View
        className="absolute left-0 right-0 px-6 bg-white border-t border-neutral-100"
        style={{ bottom: 0, paddingBottom: insets.bottom + 16, paddingTop: 16 }}
      >
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          className="rounded-2xl items-center justify-center py-4"
          style={{ backgroundColor: isSubmitting ? "#94A3B8" : "#FF5733" }}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text
              className="text-base text-white"
              style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
            >
              Create Hotel
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
