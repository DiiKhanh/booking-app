import { Stack } from "expo-router";

export default function HomeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="hotel/[id]" />
      <Stack.Screen name="room/[id]" />
      <Stack.Screen name="booking/[roomId]" />
      <Stack.Screen name="booking/review" />
      <Stack.Screen name="booking/processing" />
      <Stack.Screen name="booking/confirmation" />
    </Stack>
  );
}
