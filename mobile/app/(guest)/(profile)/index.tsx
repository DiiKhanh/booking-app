import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { Avatar } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useBookingsList } from "@/hooks/useBookings";

const MENU_SECTIONS = [
  {
    title: "Account",
    items: [
      {
        icon: "person-outline" as const,
        label: "Edit Profile",
        route: null,
        color: "#1A3A6B",
      },
      {
        icon: "card-outline" as const,
        label: "Payment Methods",
        route: "/(guest)/(profile)/payment-methods" as const,
        color: "#1A3A6B",
      },
      {
        icon: "settings-outline" as const,
        label: "Settings",
        route: "/(guest)/(profile)/settings" as const,
        color: "#1A3A6B",
      },
    ],
  },
  {
    title: "Support",
    items: [
      {
        icon: "help-circle-outline" as const,
        label: "Help & Support",
        route: null,
        color: "#7C3AED",
      },
      {
        icon: "chatbubble-outline" as const,
        label: "Contact Us",
        route: null,
        color: "#7C3AED",
      },
    ],
  },
  {
    title: "Legal",
    items: [
      {
        icon: "document-text-outline" as const,
        label: "Terms of Service",
        route: null,
        color: "#64748B",
      },
      {
        icon: "shield-outline" as const,
        label: "Privacy Policy",
        route: null,
        color: "#64748B",
      },
    ],
  },
];

function MenuRow({
  icon,
  label,
  color,
  onPress,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
  isLast: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuRow, !isLast && styles.menuRowBorder]}
      activeOpacity={0.65}
      onPress={onPress}
    >
      <View style={[styles.menuIconBox, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { data: bookings } = useBookingsList();

  const bookingCount = Array.isArray(bookings) ? bookings.length : 0;
  const confirmedCount = Array.isArray(bookings)
    ? (bookings as Array<{ status: string }>).filter(
        (b) => b.status === "confirmed",
      ).length
    : 0;

  const handleLogout = async () => {
    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    logout();
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero Header ── */}
      <LinearGradient
        colors={["#070E1E", "#1A3A6B"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 24 }]}
      >
        {/* Decorative orb */}
        <View style={styles.heroOrb} />

        {/* Avatar + info */}
        <View style={styles.heroCenter}>
          <View style={styles.avatarWrapper}>
            <Avatar uri={user?.avatar} name={user?.name ?? "U"} size="xl" />
            <TouchableOpacity style={styles.editAvatarBtn} activeOpacity={0.8}>
              <Ionicons name="camera-outline" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.heroName}>{user?.name ?? "Guest User"}</Text>
          <Text style={styles.heroEmail}>{user?.email ?? ""}</Text>

          {/* Member badge */}
          <View style={styles.memberBadge}>
            <Ionicons name="star" size={11} color="#F59E0B" />
            <Text style={styles.memberBadgeText}>StayEase Member</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{bookingCount}</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{confirmedCount}</Text>
            <Text style={styles.statLabel}>Stays</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Menu Sections ── */}
      <View style={styles.menuContainer}>
        {MENU_SECTIONS.map((section) => (
          <View key={section.title} style={styles.menuSection}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuCard}>
              {section.items.map((item, index) => (
                <MenuRow
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                  color={item.color}
                  isLast={index === section.items.length - 1}
                  onPress={() => {
                    if (item.route) router.push(item.route as never);
                  }}
                />
              ))}
            </View>
          </View>
        ))}

        {/* App version */}
        <Text style={styles.versionText}>StayEase v1.0.0</Text>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  hero: {
    paddingBottom: 0,
    position: "relative",
    overflow: "hidden",
  },
  heroOrb: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,87,51,0.08)",
    top: -60,
    right: -60,
  },
  heroCenter: {
    alignItems: "center",
    paddingBottom: 24,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 14,
  },
  editAvatarBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FF5733",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  heroName: {
    fontSize: 22,
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans-Bold",
    marginBottom: 4,
  },
  heroEmail: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Inter-Regular",
    marginBottom: 12,
  },
  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(245,158,11,0.15)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
  },
  memberBadgeText: {
    fontSize: 12,
    color: "#F59E0B",
    fontFamily: "Inter-Medium",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 18,
    marginTop: 4,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans-Bold",
  },
  statLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    fontFamily: "Inter-Regular",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  menuContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  menuSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: "Inter-Medium",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: "#1E293B",
    fontFamily: "Inter-Regular",
  },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    color: "#CBD5E1",
    fontFamily: "Inter-Regular",
    marginBottom: 16,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: 8,
  },
  logoutText: {
    fontSize: 15,
    color: "#EF4444",
    fontFamily: "PlusJakartaSans-SemiBold",
  },
});
