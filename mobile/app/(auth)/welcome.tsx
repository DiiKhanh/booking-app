import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
  FadeInDown,
} from "react-native-reanimated";

import { useAppStore } from "@/stores/app.store";

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setGuestMode } = useAppStore();

  const handleSignIn = () => {
    router.push("/(auth)/login");
  };

  const handleSignUp = () => {
    router.push("/(auth)/register");
  };

  const handleGuestMode = () => {
    setGuestMode(true);
    router.replace("/(guest)/(home)/");
  };

  return (
    <LinearGradient
      colors={["#0C1930", "#1A3A6B", "#2A4F8F"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      {/* Decorative elements */}
      <View
        className="absolute -right-24 top-20 h-72 w-72 rounded-full"
        style={{ backgroundColor: "rgba(255, 87, 51, 0.06)" }}
      />
      <View
        className="absolute -left-20 top-1/3 h-56 w-56 rounded-full"
        style={{ backgroundColor: "rgba(99, 102, 241, 0.05)" }}
      />
      <View
        className="absolute bottom-40 right-10 h-32 w-32 rounded-full"
        style={{ backgroundColor: "rgba(16, 185, 129, 0.05)" }}
      />

      <View
        className="flex-1 justify-between px-8"
        style={{
          paddingTop: insets.top + 60,
          paddingBottom: insets.bottom + 24,
        }}
      >
        {/* Top Section — Brand */}
        <Animated.View entering={FadeInDown.delay(100).duration(600)}>
          {/* Logo */}
          <View className="mb-8 items-center">
            <View
              className="h-20 w-20 items-center justify-center rounded-[24px]"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.12)" }}
            >
              <Ionicons name="bed-outline" size={40} color="#FF5733" />
            </View>
          </View>

          {/* Title */}
          <Text
            className="text-center text-4xl text-white"
            style={{ fontFamily: "PlusJakartaSans-Bold", lineHeight: 48 }}
          >
            Welcome to{"\n"}
            <Text style={{ color: "#FF5733" }}>StayEase</Text>
          </Text>

          <Text
            className="mt-4 text-center text-base leading-6"
            style={{
              fontFamily: "Inter-Regular",
              color: "rgba(255, 255, 255, 0.55)",
            }}
          >
            Find and book premium hotels worldwide.{"\n"}
            Your next adventure starts here.
          </Text>
        </Animated.View>

        {/* Middle Section — Features Preview */}
        <Animated.View
          entering={FadeInDown.delay(300).duration(600)}
          className="gap-4 py-8"
        >
          {[
            {
              icon: "globe-outline" as const,
              label: "10,000+ Hotels Worldwide",
              color: "#FF5733",
            },
            {
              icon: "star-outline" as const,
              label: "Verified Guest Reviews",
              color: "#F59E0B",
            },
            {
              icon: "card-outline" as const,
              label: "Secure & Instant Booking",
              color: "#10B981",
            },
          ].map((item) => (
            <View
              key={item.label}
              className="flex-row items-center gap-4 rounded-2xl px-5 py-3.5"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.06)" }}
            >
              <View
                className="h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${item.color}20` }}
              >
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <Text
                className="text-sm text-white"
                style={{ fontFamily: "Inter-Medium" }}
              >
                {item.label}
              </Text>
            </View>
          ))}
        </Animated.View>

        {/* Bottom Section — Actions */}
        <Animated.View
          entering={FadeInDown.delay(500).duration(600)}
          className="gap-3"
        >
          {/* Sign In Button */}
          <TouchableOpacity onPress={handleSignIn} activeOpacity={0.85}>
            <LinearGradient
              colors={["#FF5733", "#E64D2D"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="h-14 items-center justify-center rounded-2xl"
            >
              <Text
                className="text-base text-white"
                style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
              >
                Sign In
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Sign Up Button */}
          <TouchableOpacity
            onPress={handleSignUp}
            activeOpacity={0.85}
            className="h-14 items-center justify-center rounded-2xl border-2"
            style={{ borderColor: "rgba(255, 255, 255, 0.2)" }}
          >
            <Text
              className="text-base text-white"
              style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
            >
              Create Account
            </Text>
          </TouchableOpacity>

          {/* Guest Mode Divider */}
          <View className="my-2 flex-row items-center gap-4">
            <View
              className="h-px flex-1"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.1)" }}
            />
            <Text
              className="text-xs uppercase tracking-widest"
              style={{
                fontFamily: "Inter-Medium",
                color: "rgba(255, 255, 255, 0.35)",
              }}
            >
              or
            </Text>
            <View
              className="h-px flex-1"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.1)" }}
            />
          </View>

          {/* Continue as Guest */}
          <TouchableOpacity
            onPress={handleGuestMode}
            activeOpacity={0.7}
            className="flex-row items-center justify-center gap-2 py-3"
          >
            <Ionicons
              name="person-outline"
              size={18}
              color="rgba(255, 255, 255, 0.5)"
            />
            <Text
              className="text-sm"
              style={{
                fontFamily: "Inter-Medium",
                color: "rgba(255, 255, 255, 0.5)",
              }}
            >
              Continue as Guest
            </Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color="rgba(255, 255, 255, 0.35)"
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}
