/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
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
          50: "#FFF0EC",
          100: "#FFD9CF",
          200: "#FFB3A0",
          300: "#FF8D71",
          400: "#FF6F4E",
          500: "#FF5733",
          600: "#E64D2D",
          700: "#CC4327",
          800: "#B33921",
          900: "#992F1B",
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
      },
      fontFamily: {
        heading: ["PlusJakartaSans-Bold"],
        "heading-semi": ["PlusJakartaSans-SemiBold"],
        body: ["Inter-Regular"],
        "body-medium": ["Inter-Medium"],
        price: ["DMSans-Bold"],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
      },
    },
  },
  plugins: [],
};
