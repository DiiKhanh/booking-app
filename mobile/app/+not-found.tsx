import { View, Text } from "react-native";
import { Link, Stack } from "expo-router";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View className="flex-1 items-center justify-center bg-white p-6">
        <Text className="mb-4 text-2xl font-heading text-neutral-900">
          Page Not Found
        </Text>
        <Text className="mb-8 text-center text-base text-neutral-500 font-body">
          The page you're looking for doesn't exist.
        </Text>
        <Link href="/" className="text-accent-500 text-base font-heading-semi">
          Go Home
        </Link>
      </View>
    </>
  );
}
