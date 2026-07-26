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
        bg: "#090D16",
        card: "#111827",
        surface: "#0F172A",
        inset: "#0B1220",
        line: "#1E293B",
        text: "#F8FAFC",
        muted: "#94A3B8",
        cyan: "#38BDF8",
        violet: "#818CF8",
        amber: "#FBBF24",
        blue: "#60A5FA",
        rose: "#F43F5E",
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
