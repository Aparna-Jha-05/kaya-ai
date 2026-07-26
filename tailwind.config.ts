import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Theme tokens deliberately use RGB channels so Tailwind opacity
        // modifiers (for example bg-cyan/15) work in both color schemes.
        bg: "rgb(var(--color-bg) / <alpha-value>)",
        card: "rgb(var(--color-card) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        inset: "rgb(var(--color-inset) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
        text: "rgb(var(--color-text) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        cyan: "rgb(var(--color-cyan) / <alpha-value>)",
        violet: "rgb(var(--color-violet) / <alpha-value>)",
        amber: "rgb(var(--color-amber) / <alpha-value>)",
        blue: "rgb(var(--color-blue) / <alpha-value>)",
        rose: "rgb(var(--color-rose) / <alpha-value>)",
        "on-accent": "rgb(var(--color-on-accent) / <alpha-value>)",
        // Existing translucent white utilities are semantic neutral overlays,
        // not literal white, so they remain useful against light surfaces.
        white: "rgb(var(--color-overlay) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      keyframes: {
        pulseRed: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(244,63,94,0.4)" },
          "50%": { boxShadow: "0 0 0 6px rgba(244,63,94,0)" },
        },
        flowDash: {
          to: { strokeDashoffset: "-20" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        pulseRed: "pulseRed 1.8s ease-in-out infinite",
        flowDash: "flowDash 0.6s linear infinite",
        shimmer: "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
