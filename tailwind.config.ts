import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./types/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "#16a34a",
          foreground: "#f0fdf4",
        },
        warning: {
          DEFAULT: "#f59e0b",
          foreground: "#fffbeb",
        },
        info: {
          DEFAULT: "#2563eb",
          foreground: "#eff6ff",
        },
        brand: {
          50: "#f7f5ff",
          100: "#efe8ff",
          200: "#e0d1ff",
          300: "#c6adff",
          400: "#ab84ff",
          500: "#925cff",
          600: "#7c3aed",
          700: "#6422d0",
          800: "#501cac",
          900: "#43198b",
        },
        navy: {
          700: "#2a2257",
          800: "#1f1846",
          900: "#160f35",
          950: "#0e0a26",
        },
        sunset: {
          100: "#fff2e8",
          300: "#ffbb8a",
          500: "#ff8f3d",
          600: "#f97316",
          700: "#ea580c",
        },
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #7c3aed 0%, #925cff 50%, #ff8f3d 100%)",
        "brand-soft": "linear-gradient(180deg, rgba(124,58,237,0.18) 0%, rgba(255,143,61,0.08) 100%)",
        "brand-rail": "linear-gradient(180deg, #2b1466 0%, #3b1a8a 45%, #1f1846 100%)",
        "brand-cta": "linear-gradient(90deg, #7c3aed 0%, #6422d0 100%)",
      },
      borderRadius: {
        xl: "1rem",
        '2xl': "1.5rem",
      },
      boxShadow: {
        soft: "0 20px 45px -24px rgba(76, 29, 149, 0.35)",
        card: "0 1px 2px rgba(22, 15, 53, 0.04), 0 8px 24px -16px rgba(22, 15, 53, 0.18)",
      },
    },
  },
};

export default config;
