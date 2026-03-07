export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#050D1F", mid: "#0B1A35", light: "#112248" },
        brand: { DEFAULT: "#1660F5", dark: "#0040CC", light: "#4D8AFF" },
        freight: { cyan: "#06C8D4", orange: "#FF5C00" },
      },
      fontFamily: {
        syne: ["Syne", "sans-serif"],
        dm: ["DM Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
