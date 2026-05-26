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
        ink: "#17202A",
        handong: "#2563EB",
        coral: "#E76F51",
        leaf: "#2A9D8F",
      },
      boxShadow: {
        soft: "0 14px 40px rgba(23, 32, 42, 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
