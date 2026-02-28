import { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";

import { adminService } from "@/services/admin.service";
import type { User } from "@/types";

type RoleFilter = "all" | "guest" | "owner" | "admin";

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  admin: { label: "Admin", color: "#EF4444", bg: "#FEE2E2", icon: "shield-outline" },
  owner: { label: "Owner", color: "#8B5CF6", bg: "#EDE9FE", icon: "business-outline" },
  guest: { label: "Guest", color: "#3B82F6", bg: "#DBEAFE", icon: "person-outline" },
};

function UserCard({ user, index }: { user: User; index: number }) {
  const router = useRouter();
  const config = ROLE_CONFIG[user.role ?? "guest"] ?? ROLE_CONFIG.guest;
  const initials = (user.name ?? "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(330)}>
      <TouchableOpacity
        onPress={() => router.push(`/(admin)/(users)/${user.id}`)}
        className="bg-white rounded-2xl mx-6 mb-2.5 p-4 flex-row items-center"
        style={{ shadowColor: "#0F172A", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}
        activeOpacity={0.8}
      >
        {/* Avatar */}
        <View
          className="h-11 w-11 items-center justify-center rounded-full mr-3"
          style={{ backgroundColor: config.bg }}
        >
          <Text className="text-sm" style={{ fontFamily: "PlusJakartaSans-SemiBold", color: config.color }}>
            {initials}
          </Text>
        </View>

        {/* Info */}
        <View className="flex-1">
          <Text className="text-sm text-neutral-900" style={{ fontFamily: "Inter-Medium" }}>
            {user.name ?? "Unknown User"}
          </Text>
          <Text className="text-xs mt-0.5" style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}>
            {user.email ?? "—"}
          </Text>
        </View>

        {/* Role badge */}
        <View className="rounded-full px-2.5 py-1 mr-2" style={{ backgroundColor: config.bg }}>
          <Text className="text-xs" style={{ fontFamily: "Inter-Medium", color: config.color }}>
            {config.label}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={14} color="#CBD5E1" />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function UsersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const { data: users = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => adminService.getUsers(),
  });

  const filtered = (users as User[]).filter((u) => {
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchSearch = !search || (u.name ?? "").toLowerCase().includes(search.toLowerCase()) || (u.email ?? "").toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const filters: { key: RoleFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "guest", label: "Guests" },
    { key: "owner", label: "Owners" },
    { key: "admin", label: "Admins" },
  ];

  return (
    <View className="flex-1 bg-neutral-50">
      {/* Header */}
      <View
        className="bg-white border-b border-neutral-100 pb-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <View className="flex-row items-center px-4 mb-3">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <View className="ml-4 flex-1">
            <Text className="text-lg text-neutral-900" style={{ fontFamily: "PlusJakartaSans-SemiBold" }}>
              User Management
            </Text>
            <Text className="text-xs" style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}>
              {(users as User[]).length} total users
            </Text>
          </View>
        </View>

        {/* Search */}
        <View className="mx-4 mb-3 flex-row items-center rounded-xl border border-neutral-200 bg-white px-3 py-2.5">
          <Ionicons name="search-outline" size={16} color="#94A3B8" />
          <TextInput
            className="flex-1 ml-2 text-sm text-neutral-900"
            style={{ fontFamily: "Inter-Regular" }}
            placeholder="Search by name or email..."
            placeholderTextColor="#CBD5E1"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color="#CBD5E1" />
            </TouchableOpacity>
          )}
        </View>

        {/* Role filters */}
        <View className="flex-row px-4 gap-2">
          {filters.map((f) => {
            const isActive = f.key === roleFilter;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setRoleFilter(f.key)}
                className="rounded-full px-3 py-1.5"
                style={{ backgroundColor: isActive ? "#1A3A6B" : "#F1F5F9" }}
              >
                <Text
                  className="text-xs"
                  style={{ fontFamily: "Inter-Medium", color: isActive ? "#fff" : "#64748B" }}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <UserCard user={item} index={index} />}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FF5733" />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center justify-center py-20">
              <Ionicons name="people-outline" size={48} color="#CBD5E1" />
              <Text className="mt-4 text-sm" style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}>
                {search ? `No users matching "${search}"` : "No users found"}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}
