import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          slate: "#3f5e78",
          grey: "#a5a5a5",
          charcoal: "#4c5c68",
          off: "#f2f2f2",
          ink: "#222022",
          gold: "#ffc907",
          blue: "#2885d2",
        },
      },
      boxShadow: {
        brand: "0 4px 24px -4px rgba(63, 94, 120, 0.12), 0 8px 16px -8px rgba(34, 32, 34, 0.08)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};

export default config;
