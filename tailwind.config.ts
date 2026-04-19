import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: "#fefce8",
          100: "#fef9c3",
          200: "#fef08a",
          300: "#fde047",
          400: "#facc15",
          500: "#f59e0b",
          600: "#d4af37",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
        dark: {
          50: "#f8f8f8",
          100: "#e0e0e0",
          200: "#c8c8c8",
          300: "#a0a0a0",
          400: "#707070",
          500: "#505050",
          600: "#303030",
          700: "#1a1a1a",
          800: "#111111",
          900: "#0a0a0a",
        },
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      backgroundImage: {
        "gold-gradient": "linear-gradient(135deg, #d4af37 0%, #f59e0b 50%, #d4af37 100%)",
        "dark-gradient": "linear-gradient(180deg, #0a0a0a 0%, #111111 100%)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.5s ease-out",
        "pulse-gold": "pulseGold 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        pulseGold: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
