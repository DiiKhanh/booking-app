import { Stack } from "expo-router";

export default function PropertiesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="create" />
      <Stack.Screen name="rooms/[hotelId]" />
      <Stack.Screen name="rooms/create" />
      <Stack.Screen name="inventory/[roomId]" />
    </Stack>
  );
}
