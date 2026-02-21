import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  FlatList,
  type ViewToken,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  interpolateColor,
  Extrapolation,
  useAnimatedScrollHandler,
  type SharedValue,
} from "react-native-reanimated";

import { useAppStore } from "@/stores/app.store";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface OnboardingSlide {
  readonly id: string;
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly iconBg: string;
  readonly iconColor: string;
  readonly title: string;
  readonly highlight: string;
  readonly description: string;
  readonly gradient: readonly [string, string];
}

const SLIDES: OnboardingSlide[] = [
  {
    id: "1",
    icon: "search-outline",
    iconBg: "rgba(255, 87, 51, 0.15)",
    iconColor: "#FF5733",
    title: "Discover",
    highlight: "Perfect Stays",
    description:
      "Search thousands of hotels worldwide with our interactive map. Filter by price, amenities, and location to find your dream accommodation.",
    gradient: ["#0C1930", "#1A3A6B"],
  },
  {
    id: "2",
    icon: "flash-outline",
    iconBg: "rgba(16, 185, 129, 0.15)",
    iconColor: "#10B981",
    title: "Book in",
    highlight: "Seconds",
    description:
      "Real-time availability ensures your room is always ready. Our instant booking system with secure payments makes reservations effortless.",
    gradient: ["#0A2518", "#0F4C3A"],
  },
  {
    id: "3",
    icon: "shield-checkmark-outline",
    iconBg: "rgba(99, 102, 241, 0.15)",
    iconColor: "#6366F1",
    title: "Stay with",
    highlight: "Confidence",
    description:
      "Verified reviews, encrypted payments, and 24/7 support. Your safety and satisfaction are our top priorities on every trip.",
    gradient: ["#1A1040", "#2D1B69"],
  },
];

function DotIndicator({
  scrollX,
  index,
}: {
  readonly scrollX: SharedValue<number>;
  readonly index: number;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ];

    const width = interpolate(
      scrollX.value,
      inputRange,
      [8, 32, 8],
      Extrapolation.CLAMP,
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.3, 1, 0.3],
      Extrapolation.CLAMP,
    );

    const backgroundColor = interpolateColor(scrollX.value, inputRange, [
      "rgba(255,255,255,0.3)",
      "#FF5733",
      "rgba(255,255,255,0.3)",
    ]);

    return {
      width,
      opacity,
      backgroundColor,
    };
  });

  return (
    <Animated.View
      style={animatedStyle}
      className="mx-1 h-2 rounded-full"
    />
  );
}

function SlideItem({
  item,
  index,
  scrollX,
}: {
  readonly item: OnboardingSlide;
  readonly index: number;
  readonly scrollX: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ];

    const translateY = interpolate(
      scrollX.value,
      inputRange,
      [40, 0, 40],
      Extrapolation.CLAMP,
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0, 1, 0],
      Extrapolation.CLAMP,
    );

    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.8, 1, 0.8],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ translateY }, { scale }],
      opacity,
    };
  });

  return (
    <View style={{ width: SCREEN_WIDTH }} className="flex-1 justify-center px-8">
      <Animated.View style={animatedStyle}>
        {/* Icon Container */}
        <View className="mb-10 items-center">
          <View
            className="h-28 w-28 items-center justify-center rounded-[32px]"
            style={{ backgroundColor: item.iconBg }}
          >
            <Ionicons name={item.icon} size={56} color={item.iconColor} />
          </View>
        </View>

        {/* Title */}
        <View className="mb-4 items-center">
          <Text
            className="text-center text-3xl text-white"
            style={{ fontFamily: "PlusJakartaSans-Bold", lineHeight: 40 }}
          >
            {item.title}{" "}
            <Text style={{ color: "#FF5733" }}>{item.highlight}</Text>
          </Text>
        </View>

        {/* Description */}
        <Text
          className="text-center text-base leading-6"
          style={{
            fontFamily: "Inter-Regular",
            color: "rgba(255, 255, 255, 0.65)",
          }}
        >
          {item.description}
        </Text>
      </Animated.View>
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { completeOnboarding } = useAppStore();

  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      handleGetStarted();
    }
  };

  const handleSkip = () => {
    handleGetStarted();
  };

  const handleGetStarted = async () => {
    await completeOnboarding();
    router.replace("/(auth)/welcome");
  };

  const isLastSlide = currentIndex === SLIDES.length - 1;

  // Button animated style
  const buttonAnimatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (SLIDES.length - 2) * SCREEN_WIDTH,
      (SLIDES.length - 1) * SCREEN_WIDTH,
    ];

    const width = interpolate(
      scrollX.value,
      inputRange,
      [56, SCREEN_WIDTH - 64],
      Extrapolation.CLAMP,
    );

    return { width };
  });

  return (
    <LinearGradient
      colors={SLIDES[currentIndex].gradient as [string, string]}
      style={{ flex: 1 }}
    >
      {/* Header: Skip button */}
      <View
        className="flex-row items-center justify-end px-6"
        style={{ paddingTop: insets.top + 12 }}
      >
        {!isLastSlide && (
          <TouchableOpacity
            onPress={handleSkip}
            className="rounded-full px-4 py-2"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.1)" }}
          >
            <Text
              className="text-sm"
              style={{
                fontFamily: "Inter-Medium",
                color: "rgba(255, 255, 255, 0.7)",
              }}
            >
              Skip
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        keyExtractor={(item) => item.id}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item, index }) => (
          <SlideItem item={item} index={index} scrollX={scrollX} />
        )}
      />

      {/* Bottom section: Dots + Button */}
      <View
        className="items-center px-8"
        style={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* Dot indicators */}
        <View className="mb-10 flex-row items-center justify-center">
          {SLIDES.map((_, index) => (
            <DotIndicator key={index} scrollX={scrollX} index={index} />
          ))}
        </View>

        {/* Action button */}
        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={["#FF5733", "#E64D2D"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="h-14 flex-row items-center justify-center rounded-2xl px-8"
            style={{ width: isLastSlide ? SCREEN_WIDTH - 64 : undefined, minWidth: 56 }}
          >
            {isLastSlide ? (
              <Text
                className="text-base text-white"
                style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
              >
                Get Started
              </Text>
            ) : (
              <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}
