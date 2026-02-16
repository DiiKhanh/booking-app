import { View, Text, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";

import { useSearch } from "@/hooks/useSearch";

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ query?: string }>();
  const { query, setQuery } = useSearch();

  useEffect(() => {
    if (params.query) {
      setQuery(params.query);
    }
  }, [params.query, setQuery]);

  return (
    <View className="flex-1 bg-neutral-50" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-3 px-4 py-3">
        <View className="flex-1 flex-row items-center rounded-lg bg-white px-4 py-3 shadow-sm shadow-black/5">
          <Ionicons name="search-outline" size={20} color="#94A3B8" />
          <Text className="ml-2 flex-1 text-base text-neutral-400 font-body">
            {query || "Search hotels..."}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/(guest)/(search)/map")}
          className="h-12 w-12 items-center justify-center rounded-lg bg-primary-500"
        >
          <Ionicons name="map-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View className="flex-1 items-center justify-center px-6">
        <Ionicons name="search" size={48} color="#CBD5E1" />
        <Text className="mt-4 text-lg font-heading-semi text-neutral-400">
          Search for hotels
        </Text>
        <Text className="mt-2 text-center text-sm text-neutral-400 font-body">
          Enter a destination or use the map to discover hotels nearby
        </Text>
      </View>
    </View>
  );
}
