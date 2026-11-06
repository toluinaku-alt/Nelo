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
        nelo: {
          50: "#eefbf4",
          100: "#d6f5e3",
          200: "#afebcb",
          300: "#7bdaac",
          400: "#44c088",
          500: "#1fa46a",
          600: "#00684A", // Nelo Signature Brand Green
          700: "#0e6644",
          800: "#0f5138",
          900: "#0e4330",
          950: "#06261c",
        },
        amberGold: {
          50: "#fffbeb",
          100: "#fef3c7",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
        },
        slateDark: {
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        nelo: "1rem",
        neloSm: "0.625rem",
      },
    },
  },
  plugins: [],
};
export default config;
