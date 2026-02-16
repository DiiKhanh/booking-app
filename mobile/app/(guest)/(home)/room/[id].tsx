import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function RoomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-lg font-heading-semi text-neutral-900">
        Room Detail
      </Text>
      <Text className="mt-2 text-neutral-500 font-body">Room ID: {id}</Text>
    </View>
  );
}
