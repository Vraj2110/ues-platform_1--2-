import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // UES Brand Palette
        mint: {
          DEFAULT: "#F7FFF7",
          50: "rgba(247,255,247,0.05)",
          100: "rgba(247,255,247,0.1)",
          200: "rgba(247,255,247,0.2)",
          300: "rgba(247,255,247,0.3)",
          400: "rgba(247,255,247,0.4)",
          500: "rgba(247,255,247,0.5)",
          600: "rgba(247,255,247,0.6)",
          700: "rgba(247,255,247,0.7)",
        },
        pink: {
          ues: "#FF6B6B",
          light: "rgba(255,107,107,0.15)",
          glow: "rgba(255,107,107,0.3)",
        },
        cyan: {
          ues: "#4ECDC4",
          light: "rgba(78,205,196,0.1)",
          mid: "rgba(78,205,196,0.15)",
          border: "rgba(78,205,196,0.2)",
          glow: "rgba(78,205,196,0.3)",
        },
        teal: {
          DEFAULT: "#1A535C",
          dark: "#0f3238",
          mid: "#2a7a85",
          card: "rgba(26,83,92,0.4)",
          "card-hover": "rgba(26,83,92,0.6)",
          surface: "rgba(15,50,56,0.5)",
          deep: "rgba(10,35,40,0.95)",
        },
      },
      fontFamily: {
        display: ["var(--font-syne)", "sans-serif"],
        body: ["var(--font-dm-sans)", "sans-serif"],
      },
      borderRadius: {
        "2.5xl": "20px",
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(78,205,196,0.12) 0%, transparent 70%), radial-gradient(ellipse 40% 40% at 80% 70%, rgba(255,107,107,0.08) 0%, transparent 60%)",
        "auth-left":
          "linear-gradient(160deg, #1A535C 0%, #0f3238 100%)",
        "card-gradient":
          "linear-gradient(135deg, rgba(78,205,196,0.06), transparent)",
        "score-gradient":
          "linear-gradient(160deg, rgba(78,205,196,0.15), rgba(26,83,92,0.5))",
      },
      animation: {
        "pulse-dot": "pulse-dot 2s cubic-bezier(0.4,0,0.6,1) infinite",
        "fade-in": "fade-in 0.4s ease forwards",
        "slide-up": "slide-up 0.4s ease forwards",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      boxShadow: {
        "cyan-glow": "0 8px 24px rgba(78,205,196,0.3)",
        "pink-glow": "0 8px 24px rgba(255,107,107,0.3)",
        "card": "0 4px 24px rgba(0,0,0,0.2)",
      },
    },
  },
  plugins: [],
};

export default config;
