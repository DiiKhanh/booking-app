import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { Button, Input } from "@/components/ui";
import { registerSchema, type RegisterFormData } from "@/utils/validation";
import { useAuth } from "@/hooks/useAuth";

const ROLE_OPTIONS: {
  value: "guest" | "owner";
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}[] = [
  {
    value: "guest",
    label: "Book Hotels",
    icon: "briefcase-outline",
    description: "Find & book stays",
  },
  {
    value: "owner",
    label: "List My Hotel",
    icon: "business-outline",
    description: "Manage properties",
  },
];

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
  const onSubmit = (data: RegisterFormData) => register(data);

  return (
    <View style={styles.root}>
      {/* Full-screen gradient */}
      <LinearGradient
        colors={["#070E1E", "#112443", "#1A3A6B"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative orbs */}
      <View
        style={[
          styles.orb,
          {
            width: 200,
            height: 200,
            top: insets.top - 40,
            left: -70,
            backgroundColor: "rgba(255,87,51,0.08)",
          },
        ]}
      />
      <View
        style={[
          styles.orb,
          {
            width: 160,
            height: 160,
            top: insets.top + 20,
            right: -60,
            backgroundColor: "rgba(45,90,158,0.20)",
          },
        ]}
      />
      <View
        style={[
          styles.orb,
          {
            width: 90,
            height: 90,
            top: insets.top + 80,
            left: 40,
            backgroundColor: "rgba(255,87,51,0.05)",
          },
        ]}
      />

      {/* Hero section */}
      <Animated.View
        entering={FadeInDown.duration(700).delay(80)}
        style={[styles.hero, { paddingTop: insets.top + 18 }]}
      >
        {/* Logo */}
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Ionicons name="bed-outline" size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.logoText}>StayEase</Text>
        </View>
        <Text style={styles.tagline}>Start your journey today</Text>

        {/* Step indicator */}
        <View style={styles.stepsRow}>
          {["Account", "Details", "Explore"].map((step, i) => (
            <View key={step} style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  i === 0 && styles.stepDotActive,
                ]}
              >
                {i === 0 ? (
                  <Text style={styles.stepDotActiveText}>1</Text>
                ) : (
                  <Text style={styles.stepDotText}>{i + 1}</Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  i === 0 && styles.stepLabelActive,
                ]}
              >
                {step}
              </Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Form card */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.card}>
          <ScrollView
            contentContainerStyle={[
              styles.cardContent,
              { paddingBottom: insets.bottom + 24 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View entering={FadeInUp.duration(700).delay(220)}>
              <Text style={styles.cardTitle}>Create Account</Text>
              <Text style={styles.cardSubtitle}>
                Choose how you'll use StayEase
              </Text>

              {/* Role selector */}
              <View style={styles.roleRow}>
                {ROLE_OPTIONS.map((opt) => {
                  const active = selectedRole === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.roleCard, active && styles.roleCardActive]}
                      onPress={() => setValue("role", opt.value)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.roleIconWrap,
                          active && styles.roleIconWrapActive,
                        ]}
                      >
                        <Ionicons
                          name={opt.icon}
                          size={20}
                          color={active ? "#B8860B" : "#94A3B8"}
                        />
                      </View>
                      <Text
                        style={[
                          styles.roleLabel,
                          active && styles.roleLabelActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text style={styles.roleDesc}>{opt.description}</Text>
                      {active && (
                        <View style={styles.roleCheck}>
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color="#B8860B"
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Error */}
              {errorMessage ? (
                <View style={styles.errorBox}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={18}
                    color="#EF4444"
                  />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              {/* Full Name */}
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

              {/* Email */}
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Email address"
                    placeholder="you@example.com"
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

              {/* Password */}
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

              {/* Phone */}
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

              {/* Terms note */}
              <Text style={styles.termsText}>
                By creating an account you agree to our{" "}
                <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
                <Text style={styles.termsLink}>Privacy Policy</Text>.
              </Text>

              {/* CTA */}
              <Button
                title="Create Account"
                onPress={handleSubmit(onSubmit)}
                loading={registerPending}
                fullWidth
                size="lg"
              />

              {/* Sign in link */}
              <View style={styles.signinRow}>
                <Text style={styles.signinText}>
                  Already have an account?{" "}
                </Text>
                <Link href="/(auth)/login">
                  <Text style={styles.signinLink}>Sign In</Text>
                </Link>
              </View>
            </Animated.View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  orb: {
    position: "absolute",
    borderRadius: 9999,
  },
  hero: {
    paddingHorizontal: 28,
    paddingBottom: 32,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#B8860B",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  logoText: {
    fontSize: 26,
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans-Bold",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 13,
    color: "rgba(255,255,255,0.50)",
    fontFamily: "Inter-Regular",
    letterSpacing: 0.3,
    marginBottom: 18,
  },
  stepsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: {
    backgroundColor: "#B8860B",
  },
  stepDotText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    fontFamily: "PlusJakartaSans-Bold",
  },
  stepDotActiveText: {
    fontSize: 11,
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans-Bold",
  },
  stepLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.40)",
    fontFamily: "Inter-Regular",
  },
  stepLabelActive: {
    color: "rgba(255,255,255,0.90)",
    fontFamily: "Inter-Medium",
  },
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 24,
  },
  cardContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  cardTitle: {
    fontSize: 24,
    color: "#0F172A",
    fontFamily: "PlusJakartaSans-Bold",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#64748B",
    fontFamily: "Inter-Regular",
    marginBottom: 20,
  },
  roleRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  roleCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    padding: 14,
    alignItems: "center",
    position: "relative",
  },
  roleCardActive: {
    borderColor: "#B8860B",
    backgroundColor: "#FFF5F2",
  },
  roleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  roleIconWrapActive: {
    backgroundColor: "#FFE9E4",
  },
  roleLabel: {
    fontSize: 13,
    color: "#64748B",
    fontFamily: "PlusJakartaSans-SemiBold",
    textAlign: "center",
    marginBottom: 2,
  },
  roleLabelActive: {
    color: "#1E293B",
  },
  roleDesc: {
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: "Inter-Regular",
    textAlign: "center",
  },
  roleCheck: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  errorBox: {
    marginBottom: 16,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: "#DC2626",
    fontFamily: "Inter-Regular",
    flex: 1,
  },
  termsText: {
    fontSize: 12,
    color: "#94A3B8",
    fontFamily: "Inter-Regular",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 18,
  },
  termsLink: {
    color: "#B8860B",
    fontFamily: "Inter-Medium",
  },
  signinRow: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signinText: {
    color: "#64748B",
    fontFamily: "Inter-Regular",
    fontSize: 14,
  },
  signinLink: {
    color: "#1A3A6B",
    fontFamily: "PlusJakartaSans-SemiBold",
    fontSize: 14,
  },
});
