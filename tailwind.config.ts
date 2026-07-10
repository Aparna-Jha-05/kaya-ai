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
        bg: "#050F0B",
        card: "#0D2218",
        text: "#F1FFF6",
        green: "#5DE275",
        violet: "#AB7EFF",
        amber: "#F4B73F",
        blue: "#4AA2FF",
        red: "#FF4D4D",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      keyframes: {
        pulseRed: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255,77,77,0.4)" },
          "50%": { boxShadow: "0 0 0 6px rgba(255,77,77,0)" },
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
