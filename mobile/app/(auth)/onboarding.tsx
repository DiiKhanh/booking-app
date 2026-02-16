import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";

const FEATURES = [
  {
    icon: "search-outline" as const,
    title: "Discover Hotels",
    desc: "Search thousands of hotels with map-based discovery",
  },
  {
    icon: "calendar-outline" as const,
    title: "Easy Booking",
    desc: "Book rooms in seconds with real-time availability",
  },
  {
    icon: "shield-checkmark-outline" as const,
    title: "Secure Payments",
    desc: "Pay safely with our encrypted payment system",
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { navigateToRoleHome } = useAuth();

  return (
    <View
      className="flex-1 bg-white px-6"
      style={{ paddingTop: insets.top + 60, paddingBottom: insets.bottom + 20 }}
    >
      <Text className="mb-2 text-3xl font-heading text-primary-500">
        Welcome to StayEase
      </Text>
      <Text className="mb-10 text-base text-neutral-500 font-body">
        Your premium hotel booking experience
      </Text>

      <View className="flex-1 justify-center gap-8">
        {FEATURES.map((feature) => (
          <View key={feature.title} className="flex-row items-start gap-4">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-accent-50">
              <Ionicons name={feature.icon} size={24} color="#FF5733" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-heading-semi text-neutral-900">
                {feature.title}
              </Text>
              <Text className="mt-1 text-sm text-neutral-500 font-body">
                {feature.desc}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <Button
        title="Get Started"
        onPress={navigateToRoleHome}
        fullWidth
        size="lg"
      />
    </View>
  );
}
