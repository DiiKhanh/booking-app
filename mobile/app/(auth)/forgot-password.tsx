import { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from "react-native-reanimated";

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
      <View style={styles.root}>
        <LinearGradient
          colors={["#070E1E", "#112443", "#1A3A6B"]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[styles.orb, { width: 220, height: 220, top: -60, right: -80, backgroundColor: "rgba(16,185,129,0.08)" }]} />
        <View style={[styles.orb, { width: 130, height: 130, bottom: 80, left: -40, backgroundColor: "rgba(45,90,158,0.18)" }]} />

        <Animated.View
          entering={FadeInDown.duration(600)}
          style={[styles.successContainer, { paddingTop: insets.top }]}
        >
          <Animated.View entering={ZoomIn.duration(500).delay(200)} style={styles.successIconWrap}>
            <LinearGradient
              colors={["#10B981", "#059669"]}
              style={styles.successIconGradient}
            >
              <Ionicons name="mail-open-outline" size={36} color="#FFFFFF" />
            </LinearGradient>
            {/* Ripple rings */}
            <View style={[styles.successRing, { width: 90, height: 90, opacity: 0.15 }]} />
            <View style={[styles.successRing, { width: 110, height: 110, opacity: 0.08 }]} />
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(350)}>
            <Text style={styles.successTitle}>Check Your Email</Text>
            <Text style={styles.successSubtitle}>
              We've sent a password reset link to
            </Text>
            <View style={styles.emailPill}>
              <Ionicons name="mail-outline" size={14} color="#1A3A6B" />
              <Text style={styles.emailPillText}>{email}</Text>
            </View>
            <Text style={styles.successHint}>
              Didn't receive it? Check your spam folder or try again.
            </Text>

            <Button
              title="Back to Login"
              onPress={() => router.replace("/(auth)/login")}
              fullWidth
              size="lg"
            />
            <TouchableOpacity
              style={styles.resendBtn}
              onPress={() => setSubmitted(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.resendText}>Resend email</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
    );
  }

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
      <View style={[styles.orb, { width: 180, height: 180, top: insets.top - 20, right: -70, backgroundColor: "rgba(255,87,51,0.07)" }]} />
      <View style={[styles.orb, { width: 140, height: 140, top: insets.top + 30, left: -50, backgroundColor: "rgba(45,90,158,0.18)" }]} />

      {/* Hero section */}
      <Animated.View
        entering={FadeInDown.duration(700).delay(80)}
        style={[styles.hero, { paddingTop: insets.top + 14 }]}
      >
        {/* Back button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.80)" />
        </TouchableOpacity>

        {/* Icon */}
        <View style={styles.heroIconWrap}>
          <Ionicons name="key-outline" size={28} color="#FFFFFF" />
        </View>
        <Text style={styles.heroTitle}>Reset Password</Text>
        <Text style={styles.heroSubtitle}>
          Enter your email and we'll send you a reset link right away.
        </Text>
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
              <Text style={styles.cardTitle}>Forgot your password?</Text>
              <Text style={styles.cardSubtitle}>
                No worries — it happens to everyone.
              </Text>

              {/* Info box */}
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={18} color="#1A3A6B" />
                <Text style={styles.infoText}>
                  We'll send a secure link to reset your password. The link expires in 15 minutes.
                </Text>
              </View>

              <Input
                label="Email address"
                placeholder="you@example.com"
                leftIcon="mail-outline"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
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

              {/* Trust row */}
              <View style={styles.trustRow}>
                <Ionicons name="shield-checkmark-outline" size={13} color="#94A3B8" />
                <Text style={styles.trustText}>
                  Your account security is our top priority
                </Text>
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
  /* ─── Hero ─── */
  hero: {
    paddingHorizontal: 28,
    paddingBottom: 32,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  heroIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "#FF5733",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#FF5733",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.40,
    shadowRadius: 10,
    elevation: 8,
  },
  heroTitle: {
    fontSize: 26,
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans-Bold",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Inter-Regular",
    lineHeight: 20,
    maxWidth: 280,
  },
  /* ─── Card ─── */
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
    fontSize: 22,
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
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    padding: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#1E40AF",
    fontFamily: "Inter-Regular",
    lineHeight: 19,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 20,
  },
  trustText: {
    fontSize: 12,
    color: "#94A3B8",
    fontFamily: "Inter-Regular",
  },
  /* ─── Success state ─── */
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  successIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    position: "relative",
  },
  successIconGradient: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.40,
    shadowRadius: 16,
    elevation: 10,
  },
  successRing: {
    position: "absolute",
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: "#10B981",
  },
  successTitle: {
    fontSize: 26,
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans-Bold",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  successSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.60)",
    fontFamily: "Inter-Regular",
    textAlign: "center",
    marginBottom: 10,
  },
  emailPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 16,
  },
  emailPillText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontFamily: "Inter-Medium",
  },
  successHint: {
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    fontFamily: "Inter-Regular",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 19,
  },
  resendBtn: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 10,
  },
  resendText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.60)",
    fontFamily: "Inter-Medium",
  },
});
