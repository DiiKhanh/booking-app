import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui";
import { ConflictRetryModal } from "@/components/booking/ConflictRetryModal";
import { useBookingFlow } from "@/hooks/useBookingFlow";
import { useConflictRetry } from "@/hooks/useConflictRetry";
import { bookingService } from "@/services/booking.service";
import { formatCurrency, calculateNights, formatDateRange } from "@/utils/format";

type CardNetwork = "visa" | "mastercard" | "amex";

const CARD_PATTERNS: Record<string, CardNetwork> = {
  "4": "visa",
  "51": "mastercard",
  "52": "mastercard",
  "53": "mastercard",
  "34": "amex",
  "37": "amex",
};

function detectCardNetwork(number: string): CardNetwork | null {
  const cleaned = number.replace(/\s/g, "");
  for (const [prefix, network] of Object.entries(CARD_PATTERNS)) {
    if (cleaned.startsWith(prefix)) return network;
  }
  return null;
}

function formatCardNumber(value: string) {
  const cleaned = value.replace(/\D/g, "").slice(0, 16);
  return cleaned.match(/.{1,4}/g)?.join(" ") ?? cleaned;
}

function formatExpiry(value: string) {
  const cleaned = value.replace(/\D/g, "").slice(0, 4);
  if (cleaned.length > 2) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
  return cleaned;
}

export default function BookingReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { draft, updateSagaStatus, setCurrentBookingId } = useBookingFlow();
  const { conflictVisible, retrying, handleConflict, retry, dismiss } = useConflictRetry();

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const nights = draft ? calculateNights(draft.checkIn, draft.checkOut) : 0;
  const subtotal = (draft?.pricePerNight ?? 0) * nights;
  const taxes = subtotal * 0.1;
  const total = subtotal + taxes;
  const currency = draft?.currency ?? "USD";

  const cardNetwork = detectCardNetwork(cardNumber);

  const bookMutation = useMutation({
    mutationFn: () =>
      bookingService.create({
        roomId: draft!.roomId,
        checkIn: draft!.checkIn,
        checkOut: draft!.checkOut,
        guests: draft!.guests,
      }),
    onSuccess: (data) => {
      setCurrentBookingId(data.data?.id ?? "");
      updateSagaStatus("pending");
      router.push("/(guest)/(home)/booking/processing");
    },
    onError: (err: { status?: number }) => {
      if (err?.status === 409) {
        handleConflict();
      }
    },
  });

  const isFormValid =
    cardNumber.replace(/\s/g, "").length === 16 &&
    expiry.length === 5 &&
    cvv.length >= 3 &&
    cardHolder.length > 2 &&
    agreedToTerms;

  const handleConfirm = () => {
    if (!isFormValid || !draft) return;
    bookMutation.mutate();
  };

  const handleRetry = async () => {
    await retry(() => bookMutation.mutateAsync());
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
          Review & Pay
        </Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Booking Summary */}
        <View className="mx-6 mt-5">
          <Text className="mb-3 text-sm text-neutral-500 uppercase tracking-wide" style={{ fontFamily: "Inter-Medium" }}>
            Booking Summary
          </Text>
          <View
            className="rounded-2xl border border-neutral-100 overflow-hidden"
            style={{ shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 }}
          >
            {/* Hotel/Room */}
            <View className="flex-row items-start gap-4 p-4 border-b border-neutral-50">
              <View className="h-14 w-14 items-center justify-center rounded-xl bg-neutral-100">
                <Ionicons name="business-outline" size={24} color="#94A3B8" />
              </View>
              <View className="flex-1">
                <Text className="text-base text-neutral-900" style={{ fontFamily: "PlusJakartaSans-SemiBold" }}>
                  {draft?.roomName}
                </Text>
                <Text className="text-sm" style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}>
                  {draft?.hotelName}
                </Text>
              </View>
            </View>

            {/* Details */}
            <View className="p-4 gap-3">
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="calendar-outline" size={16} color="#94A3B8" />
                  <Text className="text-sm" style={{ fontFamily: "Inter-Regular", color: "#64748B" }}>Dates</Text>
                </View>
                <Text className="text-sm" style={{ fontFamily: "Inter-Medium", color: "#334155" }}>
                  {draft ? formatDateRange(draft.checkIn, draft.checkOut) : "—"}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="moon-outline" size={16} color="#94A3B8" />
                  <Text className="text-sm" style={{ fontFamily: "Inter-Regular", color: "#64748B" }}>Duration</Text>
                </View>
                <Text className="text-sm" style={{ fontFamily: "Inter-Medium", color: "#334155" }}>
                  {nights} night{nights !== 1 ? "s" : ""}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="people-outline" size={16} color="#94A3B8" />
                  <Text className="text-sm" style={{ fontFamily: "Inter-Regular", color: "#64748B" }}>Guests</Text>
                </View>
                <Text className="text-sm" style={{ fontFamily: "Inter-Medium", color: "#334155" }}>
                  {draft?.guests ?? 1}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Price Breakdown */}
        <View className="mx-6 mt-5">
          <Text className="mb-3 text-sm text-neutral-500 uppercase tracking-wide" style={{ fontFamily: "Inter-Medium" }}>
            Price Breakdown
          </Text>
          <View className="rounded-2xl" style={{ backgroundColor: "#F8FAFC", padding: 16 }}>
            <View className="gap-3">
              <View className="flex-row justify-between">
                <Text className="text-sm" style={{ fontFamily: "Inter-Regular", color: "#64748B" }}>
                  {formatCurrency(draft?.pricePerNight ?? 0, currency)} × {nights} nights
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
              <View className="border-t border-neutral-200 pt-3 flex-row justify-between">
                <Text className="text-base text-neutral-900" style={{ fontFamily: "PlusJakartaSans-SemiBold" }}>
                  Total
                </Text>
                <Text className="text-xl" style={{ fontFamily: "DMSans-Bold", color: "#FF5733" }}>
                  {formatCurrency(total, currency)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Payment Form */}
        <View className="mx-6 mt-5">
          <Text className="mb-3 text-sm text-neutral-500 uppercase tracking-wide" style={{ fontFamily: "Inter-Medium" }}>
            Payment Details
          </Text>

          {/* Card Number */}
          <View className="mb-3 rounded-2xl border border-neutral-200 px-4 py-3">
            <Text className="mb-1.5 text-xs" style={{ fontFamily: "Inter-Medium", color: "#94A3B8" }}>
              Card Number
            </Text>
            <View className="flex-row items-center">
              <TextInput
                className="flex-1 text-base text-neutral-900"
                style={{ fontFamily: "DMSans-Bold" }}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor="#CBD5E1"
                keyboardType="numeric"
                value={cardNumber}
                onChangeText={(v) => setCardNumber(formatCardNumber(v))}
                maxLength={19}
              />
              {cardNetwork && (
                <View className="ml-2 h-7 w-11 items-center justify-center rounded-md" style={{ backgroundColor: "#F1F5F9" }}>
                  <Text className="text-xs font-bold" style={{ color: "#1A3A6B" }}>
                    {cardNetwork.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Expiry + CVV */}
          <View className="mb-3 flex-row gap-3">
            <View className="flex-1 rounded-2xl border border-neutral-200 px-4 py-3">
              <Text className="mb-1.5 text-xs" style={{ fontFamily: "Inter-Medium", color: "#94A3B8" }}>
                Expiry Date
              </Text>
              <TextInput
                className="text-base text-neutral-900"
                style={{ fontFamily: "DMSans-Bold" }}
                placeholder="MM/YY"
                placeholderTextColor="#CBD5E1"
                keyboardType="numeric"
                value={expiry}
                onChangeText={(v) => setExpiry(formatExpiry(v))}
                maxLength={5}
              />
            </View>
            <View className="flex-1 rounded-2xl border border-neutral-200 px-4 py-3">
              <Text className="mb-1.5 text-xs" style={{ fontFamily: "Inter-Medium", color: "#94A3B8" }}>
                CVV
              </Text>
              <TextInput
                className="text-base text-neutral-900"
                style={{ fontFamily: "DMSans-Bold" }}
                placeholder="123"
                placeholderTextColor="#CBD5E1"
                keyboardType="numeric"
                secureTextEntry
                value={cvv}
                onChangeText={(v) => setCvv(v.replace(/\D/g, "").slice(0, 4))}
                maxLength={4}
              />
            </View>
          </View>

          {/* Card Holder */}
          <View className="mb-4 rounded-2xl border border-neutral-200 px-4 py-3">
            <Text className="mb-1.5 text-xs" style={{ fontFamily: "Inter-Medium", color: "#94A3B8" }}>
              Card Holder Name
            </Text>
            <TextInput
              className="text-base text-neutral-900"
              style={{ fontFamily: "Inter-Medium" }}
              placeholder="John Doe"
              placeholderTextColor="#CBD5E1"
              autoCapitalize="words"
              value={cardHolder}
              onChangeText={setCardHolder}
            />
          </View>

          {/* Secure badge */}
          <View className="flex-row items-center gap-2 mb-4">
            <Ionicons name="lock-closed" size={14} color="#10B981" />
            <Text className="text-xs" style={{ fontFamily: "Inter-Regular", color: "#64748B" }}>
              Your payment is secured with 256-bit SSL encryption
            </Text>
          </View>

          {/* Terms */}
          <TouchableOpacity
            onPress={() => setAgreedToTerms((v) => !v)}
            className="flex-row items-start gap-3 mb-2"
            activeOpacity={0.7}
          >
            <View
              className="mt-0.5 h-5 w-5 items-center justify-center rounded"
              style={{
                backgroundColor: agreedToTerms ? "#FF5733" : "#fff",
                borderWidth: 2,
                borderColor: agreedToTerms ? "#FF5733" : "#CBD5E1",
              }}
            >
              {agreedToTerms && <Ionicons name="checkmark" size={12} color="#fff" />}
            </View>
            <Text className="flex-1 text-sm" style={{ fontFamily: "Inter-Regular", color: "#64748B", lineHeight: 20 }}>
              I agree to the{" "}
              <Text style={{ color: "#FF5733", fontFamily: "Inter-Medium" }}>Terms of Service</Text>
              {" "}and{" "}
              <Text style={{ color: "#FF5733", fontFamily: "Inter-Medium" }}>Cancellation Policy</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <View className="h-6" />
      </ScrollView>

      {/* CTA */}
      <View className="border-t border-neutral-100 px-6 pt-4" style={{ paddingBottom: insets.bottom + 16 }}>
        <Button
          title={bookMutation.isPending ? "Processing..." : `Pay ${formatCurrency(total, currency)}`}
          fullWidth
          size="lg"
          onPress={handleConfirm}
          loading={bookMutation.isPending}
          disabled={!isFormValid || bookMutation.isPending}
        />
      </View>

      {/* 409 Conflict Modal */}
      <ConflictRetryModal
        visible={conflictVisible}
        retrying={retrying}
        onRetry={handleRetry}
        onViewAlternatives={() => {
          dismiss();
          router.back();
        }}
        onChangeDates={() => {
          dismiss();
          router.back();
        }}
        onDismiss={dismiss}
      />
    </View>
  );
}
