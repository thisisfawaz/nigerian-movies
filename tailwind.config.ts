import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/features/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Dark-first palette with accessible contrast.
        background: "hsl(222 47% 7%)",
        surface: "hsl(222 40% 11%)",
        "surface-hover": "hsl(222 38% 15%)",
        border: "hsl(222 30% 20%)",
        muted: "hsl(215 20% 65%)",
        foreground: "hsl(210 40% 98%)",
        brand: {
          DEFAULT: "hsl(266 90% 62%)",
          hover: "hsl(266 90% 68%)",
          foreground: "hsl(0 0% 100%)"
        },
        pop: {
          DEFAULT: "hsl(48 100% 55%)",
          foreground: "hsl(266 60% 12%)"
        },
        accent: {
          DEFAULT: "hsl(199 89% 48%)",
          foreground: "hsl(0 0% 100%)"
        },
        danger: {
          DEFAULT: "hsl(0 72% 51%)",
          foreground: "hsl(0 0% 100%)"
        },
        success: {
          DEFAULT: "hsl(142 71% 45%)",
          foreground: "hsl(0 0% 100%)"
        },
        warning: {
          DEFAULT: "hsl(38 92% 50%)",
          foreground: "hsl(222 47% 7%)"
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"]
      },
      borderRadius: {
        card: "0.625rem"
      },
      transitionDuration: {
        DEFAULT: "180ms"
      }
    }
  },
  plugins: []
};

export default config;
