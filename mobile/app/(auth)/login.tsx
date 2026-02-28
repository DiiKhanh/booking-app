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

  const onSubmit = (data: LoginFormData) => login(data);

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
            width: 240,
            height: 240,
            top: insets.top - 30,
            right: -90,
            backgroundColor: "rgba(255,87,51,0.09)",
          },
        ]}
      />
      <View
        style={[
          styles.orb,
          {
            width: 120,
            height: 120,
            top: insets.top + 60,
            right: 20,
            backgroundColor: "rgba(255,87,51,0.06)",
          },
        ]}
      />
      <View
        style={[
          styles.orb,
          {
            width: 190,
            height: 190,
            top: insets.top + 5,
            left: -80,
            backgroundColor: "rgba(45,90,158,0.22)",
          },
        ]}
      />

      {/* Hero Section */}
      <Animated.View
        entering={FadeInDown.duration(700).delay(80)}
        style={[styles.hero, { paddingTop: insets.top + 22 }]}
      >
        {/* Logo */}
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Ionicons name="bed-outline" size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.logoText}>StayEase</Text>
        </View>
        <Text style={styles.tagline}>Your perfect stay, anywhere</Text>

        {/* Social proof stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>10K+</Text>
            <Text style={styles.statLabel}>Hotels</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>50+</Text>
            <Text style={styles.statLabel}>Countries</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>4.9★</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
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
              <Text style={styles.cardTitle}>Welcome back</Text>
              <Text style={styles.cardSubtitle}>
                Sign in to continue to your account
              </Text>

              {/* Social login */}
              <View style={styles.socialRow}>
                <TouchableOpacity
                  style={styles.socialBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="logo-google" size={18} color="#EA4335" />
                  <Text style={styles.socialBtnText}>Google</Text>
                </TouchableOpacity>
                {Platform.OS === "ios" && (
                  <TouchableOpacity
                    style={styles.socialBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="logo-apple" size={20} color="#000000" />
                    <Text style={styles.socialBtnText}>Apple</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with email</Text>
                <View style={styles.dividerLine} />
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

              {/* Forgot password */}
              <Link href="/(auth)/forgot-password" style={styles.forgotLink}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Link>

              {/* CTA */}
              <Button
                title="Sign In"
                onPress={handleSubmit(onSubmit)}
                loading={loginPending}
                fullWidth
                size="lg"
              />

              {/* Trust indicators */}
              <View style={styles.trustRow}>
                <View style={styles.trustItem}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={12}
                    color="#94A3B8"
                  />
                  <Text style={styles.trustText}>Secure</Text>
                </View>
                <View style={styles.trustDot} />
                <View style={styles.trustItem}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={12}
                    color="#94A3B8"
                  />
                  <Text style={styles.trustText}>Encrypted</Text>
                </View>
                <View style={styles.trustDot} />
                <View style={styles.trustItem}>
                  <Ionicons
                    name="eye-off-outline"
                    size={12}
                    color="#94A3B8"
                  />
                  <Text style={styles.trustText}>Private</Text>
                </View>
              </View>

              {/* Register */}
              <View style={styles.registerRow}>
                <Text style={styles.registerText}>
                  Don't have an account?{" "}
                </Text>
                <Link href="/(auth)/register">
                  <Text style={styles.registerLink}>Sign Up</Text>
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
    paddingBottom: 40,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FF5733",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    shadowColor: "#FF5733",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  logoText: {
    fontSize: 28,
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans-Bold",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Inter-Regular",
    letterSpacing: 0.3,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 16,
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans-Bold",
  },
  statLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    fontFamily: "Inter-Regular",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginHorizontal: 20,
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
    paddingTop: 32,
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
    marginBottom: 28,
  },
  socialRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  socialBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    gap: 8,
  },
  socialBtnText: {
    fontSize: 14,
    color: "#1E293B",
    fontFamily: "Inter-Medium",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: "#94A3B8",
    fontFamily: "Inter-Regular",
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
  forgotLink: {
    alignSelf: "flex-end",
    marginTop: -8,
    marginBottom: 28,
  },
  forgotText: {
    fontSize: 13,
    color: "#FF5733",
    fontFamily: "Inter-Medium",
  },
  trustRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
    gap: 12,
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trustText: {
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: "Inter-Regular",
  },
  trustDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#CBD5E1",
  },
  registerRow: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  registerText: {
    color: "#64748B",
    fontFamily: "Inter-Regular",
    fontSize: 14,
  },
  registerLink: {
    color: "#1A3A6B",
    fontFamily: "PlusJakartaSans-SemiBold",
    fontSize: 14,
  },
});
