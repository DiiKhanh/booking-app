import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button, Input } from "@/components/ui";
import { registerSchema, type RegisterFormData } from "@/utils/validation";
import { useAuth } from "@/hooks/useAuth";

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { register, registerPending, errorMessage } = useAuth();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", role: "guest" },
  });

  const selectedRole = watch("role");

  const onSubmit = (data: RegisterFormData) => {
    register(data);
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
        <View className="mb-8">
          <Text className="text-3xl font-heading text-primary-500">
            Create Account
          </Text>
          <Text className="mt-2 text-base text-neutral-500 font-body">
            Join StayEase today
          </Text>
        </View>

        {errorMessage && (
          <View className="mb-4 rounded-md bg-error-500/10 p-3">
            <Text className="text-sm text-error-600 font-body">
              {errorMessage}
            </Text>
          </View>
        )}

        <View className="mb-6">
          <Text className="mb-2 text-sm font-body-medium text-neutral-700">
            I want to
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              className={`flex-1 items-center rounded-md border-2 p-3 ${selectedRole === "guest" ? "border-accent-500 bg-accent-50" : "border-neutral-200"}`}
              onPress={() => setValue("role", "guest")}
            >
              <Text className="text-2xl mb-1">🧳</Text>
              <Text
                className={`text-sm font-heading-semi ${selectedRole === "guest" ? "text-accent-600" : "text-neutral-600"}`}
              >
                Book Hotels
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 items-center rounded-md border-2 p-3 ${selectedRole === "owner" ? "border-accent-500 bg-accent-50" : "border-neutral-200"}`}
              onPress={() => setValue("role", "owner")}
            >
              <Text className="text-2xl mb-1">🏨</Text>
              <Text
                className={`text-sm font-heading-semi ${selectedRole === "owner" ? "text-accent-600" : "text-neutral-600"}`}
              >
                List My Hotel
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Full Name"
              placeholder="John Doe"
              leftIcon="person-outline"
              autoComplete="name"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.name?.message}
            />
          )}
        />

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
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              leftIcon="lock-closed-outline"
              isPassword
              autoComplete="new-password"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.password?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Phone (optional)"
              placeholder="+1 234 567 890"
              leftIcon="call-outline"
              keyboardType="phone-pad"
              autoComplete="tel"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value ?? ""}
              error={errors.phone?.message}
            />
          )}
        />

        <Button
          title="Create Account"
          onPress={handleSubmit(onSubmit)}
          loading={registerPending}
          fullWidth
          size="lg"
        />

        <View className="mt-6 flex-row items-center justify-center">
          <Text className="text-neutral-500 font-body">
            Already have an account?{" "}
          </Text>
          <Link
            href="/(auth)/login"
            className="text-accent-500 font-heading-semi"
          >
            Sign In
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
