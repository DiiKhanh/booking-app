/**
 * MomoTabBar — Momo-style bottom tab navigation
 *
 * Architecture:
 *  ┌──────────────────────────────────────────────────────┐  ← y=0  container top
 *  │  [BTN_R px transparent]  ← upper half of button      │
 *  │           ┌──────────────────────────────────────────┤  ← y=BTN_R  white bar top
 *  │           │  [Home]  [Search]  [  gap  ]  [Alerts]  [Profile]
 *  │           │                   "Bookings"   ← label in row
 *  │           │  [safe area padding]
 *  └───────────┴──────────────────────────────────────────┘
 *
 * The floating circle button is absolutely positioned so its CENTER sits
 * exactly at the white bar's top edge — the classic Momo proportion.
 * Its label is part of the normal row flow (not attached to the button).
 */
import { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

// ─── Measurements ─────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const PRIMARY = "#1A3A6B";
const INACTIVE = "#94A3B8";
const WHITE = "#FFFFFF";

/** Visible tab bar height (icon + label area), NOT counting safe area */
const TAB_BAR_HEIGHT = 62;

/** Center floating button */
const BTN = 52;         // diameter
const BTN_R = BTN / 2;  // radius = 26

/**
 * How much of the container above the white bar is transparent.
 * Setting PROTRUSION = BTN_R means the button's CENTER sits exactly
 * at the white bar's top edge → upper half above, lower half inside.
 * This matches Image #3's "a little higher" look.
 */
const PROTRUSION = BTN_R; // 26

/**
 * Notch depth = how far the concave curve dips from the bar's top.
 * Must cover the button's inside portion (BTN_R = 26px) with clearance.
 */
const NOTCH_DEPTH = BTN_R + 6;  // 32
const NOTCH_W = BTN_R + 16;     // 42 — half-width of notch opening
const NOTCH_CTRL = 18;           // bezier smoothness

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TabConfig {
  /** Must match the Expo Router route folder name exactly */
  routeName: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: number;
}

interface MomoTabBarProps extends BottomTabBarProps {
  leftTabs: TabConfig[];
  centerTab: TabConfig;
  rightTabs: TabConfig[];
  centerColor?: [string, string];
}

// ─── SVG Concave Notch Background ────────────────────────────────────────────

function NotchedBackground({ barHeight }: { readonly barHeight: number }) {
  const cx = SCREEN_WIDTH / 2;

  const d = [
    `M 0 0`,
    `H ${cx - NOTCH_W - NOTCH_CTRL}`,
    // Left curve down into notch
    `C ${cx - NOTCH_W + NOTCH_CTRL / 2} 0`,
    `  ${cx - NOTCH_W / 2} ${NOTCH_DEPTH}`,
    `  ${cx} ${NOTCH_DEPTH}`,
    // Right curve back up
    `C ${cx + NOTCH_W / 2} ${NOTCH_DEPTH}`,
    `  ${cx + NOTCH_W - NOTCH_CTRL / 2} 0`,
    `  ${cx + NOTCH_W + NOTCH_CTRL} 0`,
    `H ${SCREEN_WIDTH}`,
    `V ${barHeight}`,
    `H 0`,
    `Z`,
  ].join(" ");

  return (
    <Svg
      width={SCREEN_WIDTH}
      height={barHeight}
      style={{ position: "absolute", top: PROTRUSION, left: 0 }}
    >
      <Path d={d} fill={WHITE} />
    </Svg>
  );
}

// ─── Side Tab Item ────────────────────────────────────────────────────────────

interface SideTabItemProps {
  readonly config: TabConfig;
  readonly focused: boolean;
  readonly onPress: () => void;
}

function SideTabItem({ config, focused, onPress }: SideTabItemProps) {
  const pillOpacity = useSharedValue(focused ? 1 : 0);
  const pillScale = useSharedValue(focused ? 1 : 0.7);
  const iconScale = useSharedValue(focused ? 1 : 0.9);

  useEffect(() => {
    pillOpacity.value = withSpring(focused ? 1 : 0, { damping: 18, stiffness: 320 });
    pillScale.value = withSpring(focused ? 1 : 0.7, { damping: 14, stiffness: 280 });
    iconScale.value = withSpring(focused ? 1 : 0.9, { damping: 12, stiffness: 250 });
  }, [focused]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
    transform: [{ scale: pillScale.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const outlineName = `${config.icon}-outline` as keyof typeof Ionicons.glyphMap;

  return (
    <TouchableOpacity onPress={onPress} style={styles.tabItem} activeOpacity={0.7}>
      <View style={styles.iconWrap}>
        <Animated.View style={[styles.pill, pillStyle]} />
        <Animated.View style={iconStyle}>
          <Ionicons
            name={focused ? config.icon : outlineName}
            size={21}
            color={focused ? WHITE : INACTIVE}
          />
        </Animated.View>
        {config.badge !== undefined && config.badge > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{config.badge > 99 ? "99+" : config.badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.tabLabel, { color: focused ? PRIMARY : INACTIVE }]}>
        {config.label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Center Tab Slot (label-only in row) ─────────────────────────────────────
//
// The floating circle button is rendered separately via absolute positioning.
// This slot holds the "Bookings" label at the same baseline as side labels.

interface CenterSlotProps {
  readonly label: string;
  readonly focused: boolean;
}

function CenterSlot({ label, focused }: CenterSlotProps) {
  return (
    <View style={styles.centerSlot}>
      {/* Empty space matching icon height — button floats here */}
      <View style={styles.iconWrap} />
      <Text style={[styles.tabLabel, { color: focused ? PRIMARY : INACTIVE }]}>
        {label}
      </Text>
    </View>
  );
}

// ─── Floating Circle Button ───────────────────────────────────────────────────
//
// Absolutely positioned. The CENTER of this button aligns with the white
// bar's top edge (y = PROTRUSION from container top).

interface FloatingButtonProps {
  readonly config: TabConfig;
  readonly focused: boolean;
  readonly onPress: () => void;
  readonly gradientColors: [string, string];
  /** Distance of the button's BOTTOM from the container's BOTTOM */
  readonly bottomOffset: number;
}

function FloatingButton({
  config,
  focused,
  onPress,
  gradientColors,
  bottomOffset,
}: FloatingButtonProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.06 : 1, { damping: 13, stiffness: 230 });
  }, [focused]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[styles.floatWrap, { bottom: bottomOffset }, animStyle]}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.82}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.floatBtn}
        >
          <Ionicons name={config.icon} size={25} color={WHITE} />
          {config.badge !== undefined && config.badge > 0 ? (
            <View style={styles.floatBadge}>
              <Text style={styles.badgeText}>{config.badge > 99 ? "99+" : config.badge}</Text>
            </View>
          ) : null}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main MomoTabBar ──────────────────────────────────────────────────────────

export function MomoTabBar({
  state,
  navigation,
  leftTabs,
  centerTab,
  rightTabs,
  centerColor = [PRIMARY, "#2563EB"],
}: MomoTabBarProps) {
  const { bottom: safeBottom } = useSafeAreaInsets();

  // Container height = transparent zone + white bar + safe area
  // React Navigation reserves this entire height → no content overlap.
  const totalHeight = PROTRUSION + TAB_BAR_HEIGHT + safeBottom;

  // White bar occupies from y=PROTRUSION to y=totalHeight
  const whiteBarHeight = TAB_BAR_HEIGHT + safeBottom;

  // Button positioning:
  // We want button CENTER at the white bar's top edge (y = PROTRUSION from container top).
  // In "bottom from container bottom" terms:
  //   button center from bottom = totalHeight − PROTRUSION = TAB_BAR_HEIGHT + safeBottom
  //   button bottom from bottom = (TAB_BAR_HEIGHT + safeBottom) − BTN_R
  //
  // Verification (iPhone, safeBottom=34):
  //   totalHeight = 26 + 62 + 34 = 122
  //   btnBottom   = 62 + 34 − 26 = 70
  //   btn center from bottom = 70 + 26 = 96 = TAB_BAR_HEIGHT + safeBottom = white bar top ✓
  //   btn top from bottom    = 70 + 52 = 122 = totalHeight ✓ (flush with container top)
  const btnBottom = TAB_BAR_HEIGHT + safeBottom - BTN_R;

  function isFocused(routeName: string) {
    const idx = state.routes.findIndex((r) => r.name === routeName);
    return idx !== -1 && state.index === idx;
  }

  function handlePress(routeName: string) {
    const route = state.routes.find((r) => r.name === routeName);
    if (!route) return;
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  }

  return (
    // React Navigation automatically places this View at the bottom.
    // Do NOT add position: absolute — that would fight with RN's placement.
    // pointerEvents="box-none": container itself doesn't capture touches,
    // but children (button, tabs) still receive them.
    <View
      style={[styles.container, { height: totalHeight }]}
      pointerEvents="box-none"
    >
      {/* iOS blur — only covers the white bar area (below transparent zone) */}
      {Platform.OS === "ios" ? (
        <BlurView
          intensity={85}
          tint="light"
          style={[StyleSheet.absoluteFillObject, { top: PROTRUSION }]}
        />
      ) : null}

      {/* White background with concave notch, offset below transparent zone */}
      <NotchedBackground barHeight={whiteBarHeight} />

      {/* Hairline at the white bar's top edge */}
      <View style={[styles.topLine, { top: PROTRUSION }]} />

      {/* Tab row — starts exactly where the white bar starts */}
      <View style={[styles.row, { marginTop: PROTRUSION, height: TAB_BAR_HEIGHT }]}>
        {/* Left tabs */}
        <View style={styles.side}>
          {leftTabs.map((tab) => (
            <SideTabItem
              key={tab.routeName}
              config={tab}
              focused={isFocused(tab.routeName)}
              onPress={() => handlePress(tab.routeName)}
            />
          ))}
        </View>

        {/* Center slot: holds only the label; button floats above */}
        <CenterSlot
          label={centerTab.label}
          focused={isFocused(centerTab.routeName)}
        />

        {/* Right tabs */}
        <View style={styles.side}>
          {rightTabs.map((tab) => (
            <SideTabItem
              key={tab.routeName}
              config={tab}
              focused={isFocused(tab.routeName)}
              onPress={() => handlePress(tab.routeName)}
            />
          ))}
        </View>
      </View>

      {/* Floating circle button — center aligned with white bar top */}
      <FloatingButton
        config={centerTab}
        focused={isFocused(centerTab.routeName)}
        onPress={() => handlePress(centerTab.routeName)}
        gradientColors={centerColor}
        bottomOffset={btnBottom}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const PILL_W = 48;
const PILL_H = 30;

const styles = StyleSheet.create({
  container: {
    // Normal flow — React Navigation handles bottom placement.
    backgroundColor: "transparent",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 12,
  },
  topLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(15,23,42,0.07)",
  },

  // Tab row: full TAB_BAR_HEIGHT for side + center items
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  side: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    height: "100%",
  },

  // Individual tab item (side)
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    paddingTop: 8,
    paddingBottom: 6,
  },
  iconWrap: {
    width: PILL_W,
    height: PILL_H,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: PILL_H / 2,
    backgroundColor: PRIMARY,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: "Inter-Medium",
    marginTop: 3,
    letterSpacing: 0.15,
  },
  badge: {
    position: "absolute",
    top: -1,
    right: 1,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FF5733",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: WHITE,
  },
  badgeText: {
    fontSize: 8,
    color: WHITE,
    fontFamily: "PlusJakartaSans-SemiBold",
  },

  // Center slot (label only — same width as a side tab)
  centerSlot: {
    width: BTN + 24,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    paddingTop: 8,
    paddingBottom: 6,
  },

  // Floating circle button
  floatWrap: {
    position: "absolute",
    left: SCREEN_WIDTH / 2 - BTN_R,
    width: BTN,
    height: BTN,
  },
  floatBtn: {
    width: BTN,
    height: BTN,
    borderRadius: BTN_R,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 12,
    elevation: 10,
  },
  floatBadge: {
    position: "absolute",
    top: 7,
    right: 7,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FF5733",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: WHITE,
  },
});
