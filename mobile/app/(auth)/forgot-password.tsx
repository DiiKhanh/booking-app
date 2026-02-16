import { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Button, Input } from "@/components/ui";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <View
        className="flex-1 items-center justify-center bg-white px-6"
        style={{ paddingTop: insets.top }}
      >
        <View className="mb-6 h-16 w-16 items-center justify-center rounded-full bg-success-500/10">
          <Ionicons name="mail-outline" size={32} color="#10B981" />
        </View>
        <Text className="mb-2 text-xl font-heading text-neutral-900">
          Check Your Email
        </Text>
        <Text className="mb-8 text-center text-base text-neutral-500 font-body">
          We've sent a password reset link to {email}
        </Text>
        <Button
          title="Back to Login"
          onPress={() => router.replace("/(auth)/login")}
          variant="secondary"
          fullWidth
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-8">
          <Text className="text-3xl font-heading text-primary-500">
            Reset Password
          </Text>
          <Text className="mt-2 text-base text-neutral-500 font-body">
            Enter your email and we'll send you a reset link
          </Text>
        </View>

        <Input
          label="Email"
          placeholder="your@email.com"
          leftIcon="mail-outline"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Button
          title="Send Reset Link"
          onPress={handleSubmit}
          fullWidth
          size="lg"
          disabled={!email.trim()}
        />

        <Button
          title="Back to Login"
          onPress={() => router.back()}
          variant="ghost"
          fullWidth
          className="mt-3"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
