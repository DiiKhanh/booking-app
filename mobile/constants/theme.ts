export const colors = {
  primary: {
    50: "#E8EDF5",
    100: "#C5D1E8",
    200: "#9FB2D9",
    300: "#7993CB",
    400: "#5D7BC1",
    500: "#1A3A6B",
    600: "#162F56",
    700: "#112443",
    800: "#0C1930",
    900: "#070E1E",
  },
  accent: {
    50: "#FFFBEB",
    100: "#FEF3C7",
    200: "#FDE68A",
    300: "#D4A628",
    400: "#C9961A",
    500: "#B8860B",
    600: "#9A7009",
    700: "#7C5A07",
    800: "#5E4405",
    900: "#3F2E03",
  },
  success: {
    500: "#10B981",
    600: "#059669",
  },
  warning: {
    500: "#F59E0B",
    600: "#D97706",
  },
  error: {
    500: "#EF4444",
    600: "#DC2626",
  },
  neutral: {
    50: "#F8FAFC",
    100: "#F1F5F9",
    200: "#E2E8F0",
    300: "#CBD5E1",
    400: "#94A3B8",
    500: "#64748B",
    600: "#475569",
    700: "#334155",
    800: "#1E293B",
    900: "#0F172A",
  },
  white: "#FFFFFF",
  black: "#000000",
} as const;

export const typography = {
  heading: "PlusJakartaSans-Bold",
  subheading: "PlusJakartaSans-SemiBold",
  body: "Inter-Regular",
  bodyMedium: "Inter-Medium",
  caption: "Inter-Regular",
  price: "DMSans-Bold",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 48,
  "3xl": 64,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;
