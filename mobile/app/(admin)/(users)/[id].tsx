import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { adminService } from "@/services/admin.service";
import type { User } from "@/types";

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  admin: { label: "Admin", color: "#EF4444", bg: "#FEE2E2" },
  owner: { label: "Owner", color: "#8B5CF6", bg: "#EDE9FE" },
  guest: { label: "Guest", color: "#3B82F6", bg: "#DBEAFE" },
};

const ROLE_OPTIONS = ["guest", "owner", "admin"] as const;

export default function UserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => adminService.getUsers(),
  });

  const user = (users as User[]).find((u) => u.id === id);
  const [selectedRole, setSelectedRole] = useState(user?.role ?? "guest");

  const updateRoleMutation = useMutation({
    mutationFn: (role: string) => adminService.updateUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      Alert.alert("Role Updated", `User role has been changed to ${selectedRole}.`);
    },
  });

  const handleRoleChange = (role: string) => {
    Alert.alert(
      "Change Role",
      `Change this user's role to "${role}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            setSelectedRole(role);
            updateRoleMutation.mutate(role);
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Ionicons name="person-outline" size={48} color="#CBD5E1" />
        <Text className="mt-4 text-base" style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}>
          User not found
        </Text>
      </View>
    );
  }

  const config = ROLE_CONFIG[user.role ?? "guest"] ?? ROLE_CONFIG.guest;
  const initials = (user.name ?? "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

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
          User Detail
        </Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Profile section */}
        <View className="items-center pt-8 pb-6 border-b border-neutral-50">
          <View
            className="h-20 w-20 items-center justify-center rounded-full mb-3"
            style={{ backgroundColor: config.bg }}
          >
            <Text className="text-2xl" style={{ fontFamily: "PlusJakartaSans-Bold", color: config.color }}>
              {initials}
            </Text>
          </View>
          <Text className="text-xl text-neutral-900" style={{ fontFamily: "PlusJakartaSans-Bold" }}>
            {user.name ?? "Unknown"}
          </Text>
          <Text className="text-sm mt-1" style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}>
            {user.email ?? "—"}
          </Text>
          <View className="mt-2 rounded-full px-3 py-1" style={{ backgroundColor: config.bg }}>
            <Text className="text-xs" style={{ fontFamily: "Inter-Medium", color: config.color }}>
              {config.label}
            </Text>
          </View>
        </View>

        {/* Account info */}
        <View className="mx-6 mt-5">
          <Text className="text-xs uppercase tracking-wide mb-3" style={{ fontFamily: "Inter-Medium", color: "#94A3B8" }}>
            Account Information
          </Text>
          <View className="rounded-2xl border border-neutral-100">
            {[
              { icon: "person-outline" as const, label: "Full Name", value: user.name ?? "—" },
              { icon: "mail-outline" as const, label: "Email", value: user.email ?? "—" },
              { icon: "key-outline" as const, label: "User ID", value: id.slice(-8).toUpperCase() },
            ].map((item, idx, arr) => (
              <View
                key={item.label}
                className={`flex-row items-center justify-between px-4 py-3 ${idx < arr.length - 1 ? "border-b border-neutral-50" : ""}`}
              >
                <View className="flex-row items-center gap-2">
                  <Ionicons name={item.icon} size={16} color="#94A3B8" />
                  <Text className="text-sm" style={{ fontFamily: "Inter-Regular", color: "#64748B" }}>
                    {item.label}
                  </Text>
                </View>
                <Text className="text-sm" style={{ fontFamily: "Inter-Medium", color: "#334155" }}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Role management */}
        <View className="mx-6 mt-5 mb-8">
          <Text className="text-xs uppercase tracking-wide mb-3" style={{ fontFamily: "Inter-Medium", color: "#94A3B8" }}>
            Role Management
          </Text>
          <View className="gap-2">
            {ROLE_OPTIONS.map((role) => {
              const roleConfig = ROLE_CONFIG[role];
              const isCurrentRole = (user.role ?? "guest") === role;
              return (
                <TouchableOpacity
                  key={role}
                  onPress={() => !isCurrentRole && handleRoleChange(role)}
                  disabled={isCurrentRole || updateRoleMutation.isPending}
                  className="flex-row items-center rounded-2xl border p-4"
                  style={{
                    borderColor: isCurrentRole ? roleConfig.color : "#E2E8F0",
                    backgroundColor: isCurrentRole ? roleConfig.bg : "#fff",
                  }}
                >
                  <View
                    className="h-9 w-9 items-center justify-center rounded-full mr-3"
                    style={{ backgroundColor: roleConfig.color + "20" }}
                  >
                    <Ionicons
                      name={role === "admin" ? "shield-outline" : role === "owner" ? "business-outline" : "person-outline"}
                      size={18}
                      color={roleConfig.color}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-sm"
                      style={{
                        fontFamily: isCurrentRole ? "Inter-Medium" : "Inter-Regular",
                        color: isCurrentRole ? roleConfig.color : "#334155",
                      }}
                    >
                      {roleConfig.label}
                    </Text>
                    <Text className="text-xs mt-0.5" style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}>
                      {role === "admin" ? "Full system access" : role === "owner" ? "Manage properties" : "Book hotels"}
                    </Text>
                  </View>
                  {isCurrentRole && (
                    <Ionicons name="checkmark-circle" size={20} color={roleConfig.color} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
