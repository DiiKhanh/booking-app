import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-lg font-heading-semi text-neutral-900">
        Property Management
      </Text>
      <Text className="mt-2 text-neutral-500 font-body">Hotel ID: {id}</Text>
    </View>
  );
}
