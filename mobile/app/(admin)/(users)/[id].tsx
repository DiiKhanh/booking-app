import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function UserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-lg font-heading-semi text-neutral-900">
        User Detail
      </Text>
      <Text className="mt-2 text-neutral-500 font-body">User ID: {id}</Text>
    </View>
  );
}
