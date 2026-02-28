import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  addDays,
  format,
  isBefore,
  isSameDay,
  isWithinInterval,
  startOfDay,
  getDaysInMonth,
  startOfMonth,
  getDay,
} from "date-fns";

import { Button } from "@/components/ui";
import { useBookingStore } from "@/stores/booking.store";
import { formatCurrency, calculateNights } from "@/utils/format";

// ─── Mini Calendar ───────────────────────────────────────────────────────
function MiniCalendar({
  checkIn,
  checkOut,
  onSelectDate,
}: {
  checkIn?: string;
  checkOut?: string;
  onSelectDate: (date: string) => void;
}) {
  const [viewMonth, setViewMonth] = useState(new Date());
  const today = startOfDay(new Date());

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = getDaysInMonth(viewMonth);
  const firstDayOfWeek = getDay(startOfMonth(viewMonth));

  const checkInDate = checkIn ? startOfDay(new Date(checkIn)) : null;
  const checkOutDate = checkOut ? startOfDay(new Date(checkOut)) : null;

  const days: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <View>
      {/* Month Nav */}
      <View className="flex-row items-center justify-between mb-4">
        <TouchableOpacity
          onPress={() => setViewMonth(new Date(year, month - 1))}
          className="h-8 w-8 items-center justify-center rounded-full bg-neutral-100"
        >
          <Ionicons name="chevron-back" size={16} color="#64748B" />
        </TouchableOpacity>
        <Text className="text-base text-neutral-900" style={{ fontFamily: "PlusJakartaSans-SemiBold" }}>
          {format(viewMonth, "MMMM yyyy")}
        </Text>
        <TouchableOpacity
          onPress={() => setViewMonth(new Date(year, month + 1))}
          className="h-8 w-8 items-center justify-center rounded-full bg-neutral-100"
        >
          <Ionicons name="chevron-forward" size={16} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* Weekday headers */}
      <View className="flex-row mb-2">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <View key={d} className="flex-1 items-center">
            <Text className="text-xs" style={{ fontFamily: "Inter-Medium", color: "#94A3B8" }}>
              {d}
            </Text>
          </View>
        ))}
      </View>

      {/* Days grid */}
      <View className="flex-row flex-wrap">
        {days.map((day, i) => {
          if (!day) return <View key={`empty-${i}`} className="flex-1 aspect-square" />;

          const date = startOfDay(new Date(year, month, day));
          const isPast = isBefore(date, today);
          const isCheckIn = checkInDate && isSameDay(date, checkInDate);
          const isCheckOut = checkOutDate && isSameDay(date, checkOutDate);
          const isInRange =
            checkInDate && checkOutDate &&
            isWithinInterval(date, { start: checkInDate, end: checkOutDate });
          const isToday = isSameDay(date, today);

          return (
            <TouchableOpacity
              key={day}
              disabled={isPast}
              onPress={() => onSelectDate(format(date, "yyyy-MM-dd"))}
              className="flex-1 aspect-square items-center justify-center"
              activeOpacity={0.7}
            >
              <View
                className="h-9 w-9 items-center justify-center rounded-full"
                style={{
                  backgroundColor:
                    isCheckIn || isCheckOut ? "#FF5733"
                    : isInRange ? "#FFF0EC"
                    : "transparent",
                }}
              >
                <Text
                  className="text-sm"
                  style={{
                    fontFamily: isCheckIn || isCheckOut || isToday
                      ? "PlusJakartaSans-SemiBold" : "Inter-Regular",
                    color: isPast ? "#CBD5E1"
                      : isCheckIn || isCheckOut ? "#fff"
                      : isInRange ? "#FF5733"
                      : isToday ? "#1A3A6B"
                      : "#334155",
                  }}
                >
                  {day}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────
export default function BookingFormScreen() {
  const params = useLocalSearchParams<{
    roomId: string;
    roomName?: string;
    hotelName?: string;
    hotelId?: string;
    pricePerNight?: string;
    currency?: string;
    capacity?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const setDraft = useBookingStore((s) => s.setDraft);

  const roomId = params.roomId;
  const roomName = params.roomName ?? "Room";
  const hotelName = params.hotelName ?? "Hotel";
  const hotelId = params.hotelId ?? "";
  const pricePerNight = parseFloat(params.pricePerNight ?? "0");
  const currency = params.currency ?? "USD";
  const capacity = parseInt(params.capacity ?? "10");

  const [checkIn, setCheckIn] = useState(
    format(addDays(new Date(), 1), "yyyy-MM-dd")
  );
  const [checkOut, setCheckOut] = useState(
    format(addDays(new Date(), 3), "yyyy-MM-dd")
  );
  const [guests, setGuests] = useState(1);
  const [selectingDate, setSelectingDate] = useState<"checkIn" | "checkOut" | null>(null);

  const nights = calculateNights(checkIn, checkOut);
  const subtotal = pricePerNight * nights;
  const taxes = subtotal * 0.1;
  const total = subtotal + taxes;

  const handleDateSelect = (date: string) => {
    if (selectingDate === "checkIn") {
      setCheckIn(date);
      if (isBefore(new Date(checkOut), addDays(new Date(date), 1))) {
        setCheckOut(format(addDays(new Date(date), 1), "yyyy-MM-dd"));
      }
      setSelectingDate("checkOut");
    } else {
      if (isBefore(new Date(date), new Date(checkIn))) {
        setCheckIn(date);
      } else {
        setCheckOut(date);
        setSelectingDate(null);
      }
    }
  };

  const handleContinue = () => {
    setDraft({ roomId, hotelId, hotelName, roomName, pricePerNight, currency, checkIn, checkOut, guests });
    router.push("/(guest)/(home)/booking/review");
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View
        className="flex-row items-center px-4 pb-3 border-b border-neutral-100"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text className="ml-4 text-lg text-neutral-900" style={{ fontFamily: "PlusJakartaSans-SemiBold" }}>
          Select Dates
        </Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Room Info */}
        <View className="mx-6 mt-5 rounded-2xl bg-neutral-50 p-4">
          <Text className="text-base text-neutral-900" style={{ fontFamily: "PlusJakartaSans-SemiBold" }}>
            {roomName}
          </Text>
          <Text className="mt-0.5 text-sm" style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}>
            {hotelName}
          </Text>
          <View className="mt-2 flex-row items-center gap-3">
            <View className="flex-row items-center gap-1">
              <Ionicons name="people-outline" size={14} color="#94A3B8" />
              <Text className="text-sm" style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}>
                Up to {capacity} guests
              </Text>
            </View>
            <Text className="text-base" style={{ fontFamily: "DMSans-Bold", color: "#FF5733" }}>
              {formatCurrency(pricePerNight, currency)}/night
            </Text>
          </View>
        </View>

        {/* Date Selector */}
        <View className="mx-6 mt-6">
          <Text className="mb-3 text-sm text-neutral-500 uppercase tracking-wide" style={{ fontFamily: "Inter-Medium" }}>
            Choose Dates
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => setSelectingDate("checkIn")}
              className="flex-1 rounded-2xl border-2 p-4"
              style={{
                borderColor: selectingDate === "checkIn" ? "#FF5733" : "#E2E8F0",
                backgroundColor: selectingDate === "checkIn" ? "#FFF0EC" : "#fff",
              }}
            >
              <Text className="text-xs uppercase tracking-wide" style={{ fontFamily: "Inter-Medium", color: selectingDate === "checkIn" ? "#FF5733" : "#94A3B8" }}>
                Check-in
              </Text>
              <Text className="mt-1 text-base text-neutral-900" style={{ fontFamily: "PlusJakartaSans-SemiBold" }}>
                {format(new Date(checkIn), "MMM d")}
              </Text>
              <Text className="text-xs" style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}>
                {format(new Date(checkIn), "EEE, yyyy")}
              </Text>
            </TouchableOpacity>

            <View className="items-center justify-center">
              <View className="h-8 w-px bg-neutral-200" />
              <View className="absolute h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: "#F1F5F9" }}>
                <Ionicons name="arrow-forward" size={14} color="#64748B" />
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setSelectingDate("checkOut")}
              className="flex-1 rounded-2xl border-2 p-4"
              style={{
                borderColor: selectingDate === "checkOut" ? "#FF5733" : "#E2E8F0",
                backgroundColor: selectingDate === "checkOut" ? "#FFF0EC" : "#fff",
              }}
            >
              <Text className="text-xs uppercase tracking-wide" style={{ fontFamily: "Inter-Medium", color: selectingDate === "checkOut" ? "#FF5733" : "#94A3B8" }}>
                Check-out
              </Text>
              <Text className="mt-1 text-base text-neutral-900" style={{ fontFamily: "PlusJakartaSans-SemiBold" }}>
                {format(new Date(checkOut), "MMM d")}
              </Text>
              <Text className="text-xs" style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}>
                {format(new Date(checkOut), "EEE, yyyy")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Calendar */}
        {selectingDate && (
          <View
            className="mx-6 mt-4 rounded-2xl border border-neutral-100 p-5 bg-white"
            style={{ shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 }}
          >
            <Text className="mb-4 text-sm text-center" style={{ fontFamily: "Inter-Medium", color: "#94A3B8" }}>
              {selectingDate === "checkIn" ? "Select check-in date" : "Select check-out date"}
            </Text>
            <MiniCalendar checkIn={checkIn} checkOut={checkOut} onSelectDate={handleDateSelect} />
          </View>
        )}

        {/* Night count */}
        <View className="mx-6 mt-4 flex-row items-center justify-center gap-2">
          <View className="h-px flex-1 bg-neutral-100" />
          <View className="rounded-full px-4 py-1.5" style={{ backgroundColor: "#E8EDF5" }}>
            <Text className="text-sm" style={{ fontFamily: "Inter-Medium", color: "#1A3A6B" }}>
              {nights} night{nights !== 1 ? "s" : ""}
            </Text>
          </View>
          <View className="h-px flex-1 bg-neutral-100" />
        </View>

        {/* Guests */}
        <View className="mx-6 mt-6">
          <Text className="mb-3 text-sm text-neutral-500 uppercase tracking-wide" style={{ fontFamily: "Inter-Medium" }}>
            Guests
          </Text>
          <View className="flex-row items-center justify-between rounded-2xl border border-neutral-200 p-4">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: "#F1F5F9" }}>
                <Ionicons name="people-outline" size={20} color="#475569" />
              </View>
              <View>
                <Text className="text-base text-neutral-900" style={{ fontFamily: "PlusJakartaSans-SemiBold" }}>
                  {guests} Guest{guests !== 1 ? "s" : ""}
                </Text>
                <Text className="text-xs" style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}>
                  Max {capacity}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                onPress={() => setGuests((g) => Math.max(1, g - 1))}
                disabled={guests <= 1}
                className="h-10 w-10 items-center justify-center rounded-full border border-neutral-200"
              >
                <Ionicons name="remove" size={20} color={guests <= 1 ? "#CBD5E1" : "#475569"} />
              </TouchableOpacity>
              <Text className="w-6 text-center text-base text-neutral-900" style={{ fontFamily: "PlusJakartaSans-SemiBold" }}>
                {guests}
              </Text>
              <TouchableOpacity
                onPress={() => setGuests((g) => Math.min(capacity, g + 1))}
                disabled={guests >= capacity}
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: "#1A3A6B" }}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Price Breakdown */}
        <View className="mx-6 mt-6 mb-4 rounded-2xl p-5" style={{ backgroundColor: "#F8FAFC" }}>
          <Text className="mb-3 text-sm text-neutral-500 uppercase tracking-wide" style={{ fontFamily: "Inter-Medium" }}>
            Price Breakdown
          </Text>
          <View className="gap-2">
            <View className="flex-row justify-between">
              <Text className="text-sm" style={{ fontFamily: "Inter-Regular", color: "#64748B" }}>
                {formatCurrency(pricePerNight, currency)} × {nights} nights
              </Text>
              <Text className="text-sm" style={{ fontFamily: "Inter-Medium", color: "#334155" }}>
                {formatCurrency(subtotal, currency)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm" style={{ fontFamily: "Inter-Regular", color: "#64748B" }}>
                Taxes & fees (10%)
              </Text>
              <Text className="text-sm" style={{ fontFamily: "Inter-Medium", color: "#334155" }}>
                {formatCurrency(taxes, currency)}
              </Text>
            </View>
            <View className="mt-2 border-t border-neutral-200 pt-3 flex-row justify-between">
              <Text className="text-base text-neutral-900" style={{ fontFamily: "PlusJakartaSans-SemiBold" }}>
                Total
              </Text>
              <Text className="text-lg" style={{ fontFamily: "DMSans-Bold", color: "#FF5733" }}>
                {formatCurrency(total, currency)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* CTA */}
      <View className="border-t border-neutral-100 px-6 pt-4" style={{ paddingBottom: insets.bottom + 16 }}>
        <Button
          title={`Continue — ${formatCurrency(total, currency)}`}
          fullWidth
          size="lg"
          onPress={handleContinue}
          disabled={nights < 1}
        />
      </View>
    </View>
  );
}
