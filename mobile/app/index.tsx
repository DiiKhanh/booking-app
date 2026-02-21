import { useEffect, useCallback } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { useAppStore } from "@/stores/app.store";
import { useAuthStore } from "@/stores/auth.store";
import { authService } from "@/services/auth.service";

const TOKEN_KEY = "auth_access_token";
const SPLASH_DURATION = 2200;

export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { hasSeenOnboarding, isAppReady, loadOnboardingStatus } = useAppStore();
  const { setUser, clearUser } = useAuthStore();

  // Animations
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);
  const dotOpacity = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const dotAnimatedStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
  }));

  const screenAnimatedStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  // Start entrance animations
  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 600 });
    logoScale.value = withSpring(1, {
      damping: 12,
      stiffness: 100,
    });

    titleOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));
    titleTranslateY.value = withDelay(
      400,
      withSpring(0, { damping: 14, stiffness: 90 }),
    );

    subtitleOpacity.value = withDelay(700, withTiming(1, { duration: 500 }));
    dotOpacity.value = withDelay(
      1000,
      withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(0.3, { duration: 400 }),
        withTiming(1, { duration: 400 }),
        withTiming(0.3, { duration: 400 }),
      ),
    );
  }, []);

  // Load onboarding status on mount
  useEffect(() => {
    loadOnboardingStatus();
  }, [loadOnboardingStatus]);

  const navigateAway = useCallback(
    (destination: string) => {
      screenOpacity.value = withTiming(
        0,
        { duration: 300, easing: Easing.out(Easing.ease) },
        () => {
          runOnJS(router.replace)(destination as any);
        },
      );
    },
    [router, screenOpacity],
  );

  // Navigation logic after splash
  useEffect(() => {
    if (!isAppReady) return;

    const timer = setTimeout(async () => {
      if (!hasSeenOnboarding) {
        navigateAway("/(auth)/onboarding");
        return;
      }

      // Try to restore session
      const token = await SecureStore.getItemAsync(TOKEN_KEY);

      if (!token) {
        clearUser();
        navigateAway("/(auth)/welcome");
        return;
      }

      try {
        const me = await authService.getMe();
        setUser(me);
        navigateByRole(me.role, navigateAway);
      } catch {
        clearUser();
        navigateAway("/(auth)/welcome");
      }
    }, SPLASH_DURATION);

    return () => clearTimeout(timer);
  }, [isAppReady, hasSeenOnboarding, navigateAway, setUser, clearUser]);

  return (
    <Animated.View style={[{ flex: 1 }, screenAnimatedStyle]}>
      <LinearGradient
        colors={["#0C1930", "#1A3A6B", "#2A4F8F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        {/* Decorative circles */}
        <View
          className="absolute -right-20 -top-20 h-64 w-64 rounded-full"
          style={{ backgroundColor: "rgba(255, 87, 51, 0.08)" }}
        />
        <View
          className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full"
          style={{ backgroundColor: "rgba(255, 87, 51, 0.06)" }}
        />

        <View
          className="flex-1 items-center justify-center"
          style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        >
          {/* Logo Icon */}
          <Animated.View
            style={logoAnimatedStyle}
            className="mb-6 h-24 w-24 items-center justify-center rounded-3xl"
          >
            <View
              className="h-24 w-24 items-center justify-center rounded-3xl"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.15)" }}
            >
              <Ionicons name="bed-outline" size={48} color="#FF5733" />
            </View>
          </Animated.View>

          {/* Brand Name */}
          <Animated.View style={titleAnimatedStyle}>
            <Text
              className="text-4xl text-white"
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
            >
              Stay
              <Text style={{ color: "#FF5733" }}>Ease</Text>
            </Text>
          </Animated.View>

          {/* Tagline */}
          <Animated.View style={subtitleAnimatedStyle} className="mt-3">
            <Text
              className="text-base tracking-wider"
              style={{
                fontFamily: "Inter-Regular",
                color: "rgba(255, 255, 255, 0.6)",
              }}
            >
              Premium Hotel Booking
            </Text>
          </Animated.View>

          {/* Loading dots */}
          <Animated.View
            style={dotAnimatedStyle}
            className="mt-12 flex-row items-center gap-2"
          >
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor:
                    i === 1
                      ? "#FF5733"
                      : "rgba(255, 255, 255, 0.4)",
                }}
              />
            ))}
          </Animated.View>
        </View>

        {/* Footer */}
        <View
          className="items-center pb-4"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <Text
            className="text-xs"
            style={{
              fontFamily: "Inter-Regular",
              color: "rgba(255, 255, 255, 0.3)",
            }}
          >
            © 2026 StayEase. All rights reserved.
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

function navigateByRole(
  role: string,
  navigate: (path: string) => void,
) {
  switch (role) {
    case "owner":
      navigate("/(owner)/(dashboard)/");
      break;
    case "admin":
      navigate("/(admin)/(overview)/");
      break;
    default:
      navigate("/(guest)/(home)/");
      break;
  }
}
