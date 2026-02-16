import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button, Input } from "@/components/ui";
import { loginSchema, type LoginFormData } from "@/utils/validation";
import { useAuth } from "@/hooks/useAuth";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, loginPending, errorMessage } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: LoginFormData) => {
    login(data);
  };

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
        <View className="mb-10">
          <Text className="text-3xl font-heading text-primary-500">
            StayEase
          </Text>
          <Text className="mt-2 text-base text-neutral-500 font-body">
            Sign in to continue
          </Text>
        </View>

        {errorMessage && (
          <View className="mb-4 rounded-md bg-error-500/10 p-3">
            <Text className="text-sm text-error-600 font-body">
              {errorMessage}
            </Text>
          </View>
        )}

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Email"
              placeholder="your@email.com"
              leftIcon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.email?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Password"
              placeholder="Enter your password"
              leftIcon="lock-closed-outline"
              isPassword
              autoComplete="password"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.password?.message}
            />
          )}
        />

        <Link
          href="/(auth)/forgot-password"
          className="mb-6 self-end text-sm text-accent-500 font-body-medium"
        >
          Forgot Password?
        </Link>

        <Button
          title="Sign In"
          onPress={handleSubmit(onSubmit)}
          loading={loginPending}
          fullWidth
          size="lg"
        />

        <View className="mt-6 flex-row items-center justify-center">
          <Text className="text-neutral-500 font-body">
            Don't have an account?{" "}
          </Text>
          <Link
            href="/(auth)/register"
            className="text-accent-500 font-heading-semi"
          >
            Sign Up
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
